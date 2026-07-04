"""Code catalog domain logic: CRUD + hierarchical CSV import (BIZ-002).

Web-independent (must not import from ``walker.api``). Import upserts by ``code_number`` so a
re-import is idempotent; colors are auto-assigned from a palette (not carried by the file).
"""

from __future__ import annotations

import csv
import io
from dataclasses import dataclass, field

from sqlalchemy import ColumnElement, func, select
from sqlalchemy.orm import Session

from walker.exceptions import CatalogImportError, NotFoundError, ValidationError
from walker.models import Activity, Entry, TimesheetCode, User

# Accent palette for auto-assigned code colors (editable later).
PALETTE = ["#5b9cf6", "#3fb68b", "#c88b5b", "#a879d6", "#e0697f", "#6cc0d6", "#d6a24a", "#7a86e0"]
_REQUIRED_COLUMNS = ["code_number", "code_label", "code_name", "activity_code", "activity_label"]


@dataclass
class ParsedActivity:
    """An activity parsed from the import file / an API write model."""

    code: str
    label: str


@dataclass
class ParsedCode:
    """A code (with its activities) parsed from the import file."""

    number: str
    label: str
    name: str
    activities: list[ParsedActivity] = field(default_factory=list)


def _auto_color(index: int) -> str:
    return PALETTE[index % len(PALETTE)]


def _organization_id(session: Session, user_id: int) -> int | None:
    """Return the Organization a user belongs to, or ``None`` (a not-yet-migrated standalone user)."""
    return session.scalar(select(User.organization_id).where(User.id == user_id))


def _count_codes(session: Session, user_id: int, organization_id: int | None) -> int:
    """Count the codes visible to a user: their Organization's real codes + their own virtual codes."""
    total = session.scalar(
        select(func.count()).select_from(TimesheetCode).where(_visible_codes_filter(user_id, organization_id))
    )
    return total or 0


def _visible_codes_filter(user_id: int, organization_id: int | None) -> ColumnElement[bool]:
    """SQLAlchemy filter for codes visible to ``user_id``: own virtual codes + the Organization's real codes.

    A user with no Organization (not yet migrated, e.g. freshly bootstrapped by
    ``get_current_user`` — see ADR-0007) falls back to seeing only their own real codes, matching
    pre-BIZ-030 single-user behavior exactly.
    """
    own_virtual = (TimesheetCode.user_id == user_id) & TimesheetCode.real_code_id.is_not(None)
    if organization_id is None:
        own_real = (TimesheetCode.user_id == user_id) & TimesheetCode.real_code_id.is_(None)
        return own_virtual | own_real
    org_real = (TimesheetCode.organization_id == organization_id) & TimesheetCode.real_code_id.is_(None)
    return own_virtual | org_real


def _owned_virtual_code(session: Session, user_id: int, code_id: int) -> TimesheetCode:
    """Return the user's own virtual code, or raise ``NotFoundError``."""
    code = session.get(TimesheetCode, code_id)
    if code is None or not code.is_virtual or code.user_id != user_id:
        raise NotFoundError(f"Code {code_id} not found.")
    return code


def _real_code_visible(code: TimesheetCode, user_id: int, organization_id: int | None) -> bool:
    """Whether a real code is visible to a user: same Organization, or (no Organization) same user."""
    if organization_id is None:
        return code.organization_id is None and code.user_id == user_id
    return code.organization_id == organization_id


def _visible_real_code(session: Session, user_id: int, code_id: int) -> TimesheetCode:
    """Return a real code visible to the user's Organization, or raise ``NotFoundError``."""
    organization_id = _organization_id(session, user_id)
    code = session.get(TimesheetCode, code_id)
    if code is None or code.is_virtual or not _real_code_visible(code, user_id, organization_id):
        raise NotFoundError(f"Code {code_id} not found.")
    return code


def get_visible_code(session: Session, user_id: int, code_id: int) -> TimesheetCode:
    """Return a code (real or virtual) visible to the user, or raise ``NotFoundError``."""
    code = session.get(TimesheetCode, code_id)
    if code is None:
        raise NotFoundError(f"Code {code_id} not found.")
    if code.is_virtual:
        if code.user_id != user_id:
            raise NotFoundError(f"Code {code_id} not found.")
        return code
    organization_id = _organization_id(session, user_id)
    if not _real_code_visible(code, user_id, organization_id):
        raise NotFoundError(f"Code {code_id} not found.")
    return code


def list_codes(session: Session, user_id: int) -> list[TimesheetCode]:
    """Return the codes visible to a user: their Organization's real codes + their own virtual codes."""
    organization_id = _organization_id(session, user_id)
    return list(
        session.scalars(
            select(TimesheetCode).where(_visible_codes_filter(user_id, organization_id)).order_by(TimesheetCode.number)
        )
    )


def create_code(
    session: Session,
    user_id: int,
    *,
    number: str,
    label: str,
    name: str | None,
    color: str | None,
    activities: list[ParsedActivity],
) -> TimesheetCode:
    """Create a new real code (+ activities), scoped to the user's Organization (ADR-0010).

    Rejects a duplicate ``number`` within the Organization. A user with no Organization (not yet
    migrated) gets a code visible only to themselves (``organization_id`` stays ``None``).
    """
    organization_id = _organization_id(session, user_id)
    scope: ColumnElement[bool]
    if organization_id is None:
        scope = (TimesheetCode.organization_id.is_(None)) & (TimesheetCode.user_id == user_id)
    else:
        scope = TimesheetCode.organization_id == organization_id
    existing = session.scalar(
        select(TimesheetCode).where(scope, TimesheetCode.number == number, TimesheetCode.real_code_id.is_(None))
    )
    if existing is not None:
        raise ValidationError(f"A code with number {number} already exists.")
    code = TimesheetCode(
        user_id=user_id,
        organization_id=organization_id,
        number=number,
        label=label,
        name=name or label,
        color=color or _auto_color(_count_codes(session, user_id, organization_id)),
        activities=[Activity(code=a.code, label=a.label) for a in activities],
    )
    session.add(code)
    session.commit()
    session.refresh(code)
    return code


def update_code(
    session: Session,
    user_id: int,
    code_id: int,
    *,
    number: str,
    label: str,
    name: str | None,
    color: str | None,
    activities: list[ParsedActivity],
) -> TimesheetCode:
    """Update a real code and replace its activities. Any member of the owning Organization may edit it."""
    code = _visible_real_code(session, user_id, code_id)
    code.number = number
    code.label = label
    code.name = name or label
    if color:
        code.color = color
    code.activities = [Activity(code=a.code, label=a.label) for a in activities]
    session.commit()
    session.refresh(code)
    return code


def create_virtual_code(
    session: Session,
    user_id: int,
    *,
    real_code_id: int,
    name: str,
    color: str | None,
) -> TimesheetCode:
    """Create a virtual code backed by a real code (ADR-0008); ``name`` is unique per user.

    Borrows ``number``, ``label``, and Activities from the real code; owns ``name`` and ``color``.
    The backing real code must be visible in the user's Organization catalog.
    """
    real = get_visible_code(session, user_id, real_code_id)
    if real.is_virtual:
        raise ValidationError("A virtual code must be backed by a real code, not another virtual code.")
    existing = session.scalar(
        select(TimesheetCode).where(
            TimesheetCode.user_id == user_id,
            TimesheetCode.name == name,
            TimesheetCode.real_code_id.is_not(None),
        )
    )
    if existing is not None:
        raise ValidationError(f"A virtual code named {name!r} already exists.")
    code = TimesheetCode(
        user_id=user_id,
        organization_id=None,
        number=real.number,
        label=real.label,
        name=name,
        color=color or _auto_color(_count_codes(session, user_id, _organization_id(session, user_id))),
        real_code_id=real.id,
    )
    session.add(code)
    session.commit()
    session.refresh(code)
    return code


def update_virtual_code(
    session: Session,
    user_id: int,
    code_id: int,
    *,
    real_code_id: int,
    name: str,
    color: str | None,
) -> TimesheetCode:
    """Update a virtual code's name, colour, and/or backing real code (ADR-0008).

    Mirrors ``create_virtual_code``'s validation: the target real code must exist, be visible in the
    user's Organization catalog, and not itself be virtual; ``name`` must be unique per user,
    excluding this code itself.
    """
    virtual = _owned_virtual_code(session, user_id, code_id)
    real = get_visible_code(session, user_id, real_code_id)
    if real.is_virtual:
        raise ValidationError("A virtual code must be backed by a real code, not another virtual code.")
    existing = session.scalar(
        select(TimesheetCode).where(
            TimesheetCode.user_id == user_id,
            TimesheetCode.name == name,
            TimesheetCode.real_code_id.is_not(None),
            TimesheetCode.id != code_id,
        )
    )
    if existing is not None:
        raise ValidationError(f"A virtual code named {name!r} already exists.")
    virtual.number = real.number
    virtual.label = real.label
    virtual.name = name
    if color:
        virtual.color = color
    virtual.real_code_id = real.id
    session.commit()
    session.refresh(virtual)
    return virtual


def delete_code(session: Session, user_id: int, code_id: int) -> None:
    """Delete a code visible to the user.

    A real code's in-use guard checks the whole Organization: any member's Entry or virtual code
    depending on it blocks the deletion, not just the acting user's (BIZ-030).
    """
    code = get_visible_code(session, user_id, code_id)
    references = session.scalar(select(func.count()).select_from(Entry).where(Entry.timesheet_code_id == code_id))
    if references:
        raise ValidationError(f"Code {code.number} is referenced by entries and cannot be deleted.")
    if not code.is_virtual:
        virtual_children = session.scalar(
            select(func.count()).select_from(TimesheetCode).where(TimesheetCode.real_code_id == code_id)
        )
        if virtual_children:
            raise ValidationError(f"Code {code.number} has virtual codes pointing to it and cannot be deleted.")
    session.delete(code)
    session.commit()


def parse_catalog_csv(text: str) -> list[ParsedCode]:
    """Parse a hierarchical catalog CSV, grouped by ``code_number`` (one row per code × activity).

    Two layouts are accepted:

    * **Headered** — first row is ``code_number,code_label,code_name,activity_code,activity_label``.
    * **Headerless export** — four columns
      ``code_number,code_label,activity_code,activity_label`` (``code_name`` defaults to
      ``code_label``); quoted fields may contain commas.

    Raises ``CatalogImportError`` on an empty file or one with no codes.
    """
    rows = [row for row in csv.reader(io.StringIO(text.lstrip("\ufeff"))) if row]
    if not rows:
        raise CatalogImportError("The import file is empty.")

    headered = [cell.strip().lower() for cell in rows[0]] == _REQUIRED_COLUMNS
    data_rows = rows[1:] if headered else rows
    min_columns = 5 if headered else 4

    codes: dict[str, ParsedCode] = {}
    for row in data_rows:
        if len(row) < min_columns:
            continue
        number = row[0].strip()
        if not number:
            continue
        label = row[1].strip()
        if headered:
            name = row[2].strip() or label
            activity_code = row[3].strip()
            activity_label = ",".join(row[4:]).strip()
        else:
            name = label
            activity_code = row[2].strip()
            activity_label = ",".join(row[3:]).strip()

        parsed = codes.get(number)
        if parsed is None:
            parsed = ParsedCode(number=number, label=label, name=name)
            codes[number] = parsed
        if activity_code or activity_label:
            parsed.activities.append(ParsedActivity(code=activity_code, label=activity_label))

    if not codes:
        raise CatalogImportError("No codes found in the import file.")
    return list(codes.values())
