"""Code catalog domain logic: CRUD + hierarchical CSV import (BIZ-002).

Web-independent (must not import from ``walker.api``). Import upserts by ``code_number`` so a
re-import is idempotent; colors are auto-assigned from a palette (not carried by the file).
"""

from __future__ import annotations

import csv
import io
from dataclasses import dataclass, field
from datetime import date

from sqlalchemy import ColumnElement, delete, func, select, update
from sqlalchemy.orm import Session

from walker.exceptions import CatalogImportError, NotFoundError, ValidationError
from walker.models import Activity, ChecklistMark, Entry, Task, TimesheetCode, User
from walker.services.palette import suggest_color

_REQUIRED_COLUMNS = ["code_number", "code_label", "code_name", "activity_code", "activity_label"]
# BIZ-068: the enriched layout adds ``customer`` + ``code_type`` (T&E grid ordering keys) between
# ``code_name`` and the activity columns.
_ENRICHED_COLUMNS = [
    "code_number",
    "code_label",
    "code_name",
    "customer",
    "code_type",
    "activity_code",
    "activity_label",
]


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
    customer: str | None = None
    code_type: str | None = None
    activities: list[ParsedActivity] = field(default_factory=list)


def _organization_id(session: Session, user_id: int) -> int | None:
    """Return the Organization a user belongs to, or ``None`` (a not-yet-migrated standalone user)."""
    return session.scalar(select(User.organization_id).where(User.id == user_id))


def _suggested_color(session: Session, user_id: int, organization_id: int | None) -> str:
    """Least-used-first colour (BIZ-048) over the codes visible to the user, avoiding those in use."""
    used = session.scalars(select(TimesheetCode.color).where(_visible_codes_filter(user_id, organization_id)))
    return suggest_color(used)


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
    customer: str | None = None,
    code_type: str | None = None,
    backing_only: bool = False,
) -> TimesheetCode:
    """Create a new real code (+ activities), scoped to the user's Organization (ADR-0010).

    Rejects a duplicate ``number`` within the Organization. A user with no Organization (not yet
    migrated) gets a code visible only to themselves (``organization_id`` stays ``None``).
    ``customer``/``code_type`` are the optional T&E grid-ordering keys (BIZ-068). ``backing_only``
    marks a code auto-created solely to back a virtual code — hidden from the SPA (BIZ-075, ADR-0014).
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
        color=color or _suggested_color(session, user_id, organization_id),
        customer=customer,
        code_type=code_type,
        backing_only=backing_only,
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
        color=color or _suggested_color(session, user_id, _organization_id(session, user_id)),
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


@dataclass(frozen=True)
class BlockingEntries:
    """What is standing between a code and its deletion (BIZ-088).

    The counts are **Organization-wide**, mirroring ``delete_code``'s guard (BIZ-030): another
    member's Entry blocks the deletion just as the acting user's does. ``own``/``others`` splits them
    because only ``own`` can be reassigned or deleted from here — every Entry write path is
    user-scoped, and acting on someone else's captured time is an authorization decision this ticket
    deliberately does not take.
    """

    total: int
    own: int
    others: int
    first_date: date | None
    last_date: date | None
    minutes: int

    def describe(self) -> str:
        """A one-line, human-readable account of the block — the text the API surfaces verbatim."""
        if not self.total:
            return "no entries reference it"
        plural = "entries" if self.total > 1 else "entry"
        span = f" between {self.first_date} and {self.last_date}" if self.first_date else ""
        detail = f"{self.total} {plural}{span} ({self.minutes} min)"
        if self.others:
            whose = "all of them" if not self.own else f"{self.others} of them"
            detail += f" — {whose} belong to another member, so they cannot be resolved from here"
        return f"{detail} reference it" if not self.others else detail


def blocking_entries(session: Session, user_id: int, code_id: int) -> BlockingEntries:
    """Summarize the Entries preventing ``code_id``'s deletion (BIZ-088).

    Counts every member's Entries so the block is explainable, but reports separately how many are
    the acting user's — the only ones the resolve actions below can touch. A *running* Entry counts
    towards the block (it holds the foreign key) while contributing no minutes, consistently with
    ``aggregate_period``.
    """
    get_visible_code(session, user_id, code_id)
    referencing = Entry.timesheet_code_id == code_id
    total, first_date, last_date = session.execute(
        select(func.count(), func.min(Entry.date), func.max(Entry.date)).where(referencing)
    ).one()
    own = session.scalar(select(func.count()).select_from(Entry).where(referencing, Entry.user_id == user_id))
    minutes = session.scalar(
        select(func.coalesce(func.sum(Entry.end_minute - Entry.start_minute), 0)).where(
            referencing, Entry.end_minute.is_not(None)
        )
    )
    return BlockingEntries(
        total=total or 0,
        own=own or 0,
        others=(total or 0) - (own or 0),
        first_date=first_date,
        last_date=last_date,
        minutes=minutes or 0,
    )


def list_blocking_entries(session: Session, user_id: int, code_id: int) -> list[Entry]:
    """The acting user's own Entries referencing ``code_id``, newest first.

    Deliberately not the whole Organization's: an Entry the user cannot act on is a number in
    :class:`BlockingEntries`, not a row to render.
    """
    get_visible_code(session, user_id, code_id)
    return list(
        session.scalars(
            select(Entry)
            .where(Entry.timesheet_code_id == code_id, Entry.user_id == user_id)
            .order_by(Entry.date.desc(), Entry.start_minute.desc())
        )
    )


def _own_entry_count(session: Session, user_id: int, code_id: int) -> int:
    """How many of the user's own Entries reference ``code_id``.

    Counted up-front rather than read back from the statement's ``rowcount``, which is
    driver-dependent and untyped in SQLAlchemy 2.0's ``Result``.
    """
    return (
        session.scalar(
            select(func.count()).select_from(Entry).where(Entry.timesheet_code_id == code_id, Entry.user_id == user_id)
        )
        or 0
    )


def reassign_blocking_entries(
    session: Session, user_id: int, code_id: int, *, target_code_id: int, activity: str
) -> int:
    """Move the user's Entries off ``code_id`` onto ``target_code_id`` + ``activity`` (BIZ-088).

    One statement rather than a per-entry loop: a partial failure mid-loop would leave the catalog in
    a state the user cannot reason about. ``activity`` is required — a code change without one would
    push the entries into the period grid's uncategorized bucket, trading one problem for another.
    Returns how many were moved.
    """
    get_visible_code(session, user_id, code_id)
    target = get_visible_code(session, user_id, target_code_id)
    if target.id == code_id:
        raise ValidationError("Entries cannot be reassigned to the code being deleted.")
    if not activity.strip():
        raise ValidationError("Reassigning entries requires an activity.")
    moved = _own_entry_count(session, user_id, code_id)
    session.execute(
        update(Entry)
        .where(Entry.timesheet_code_id == code_id, Entry.user_id == user_id)
        .values(timesheet_code_id=target.id, activity=activity.strip())
    )
    session.commit()
    return moved


def delete_blocking_entries(session: Session, user_id: int, code_id: int) -> int:
    """Delete the user's Entries referencing ``code_id`` (BIZ-088). Returns how many were removed.

    Destructive and unrecoverable — captured time is gone. The caller is responsible for the
    deliberate second step; the service does not guess.
    """
    get_visible_code(session, user_id, code_id)
    removed = _own_entry_count(session, user_id, code_id)
    session.execute(delete(Entry).where(Entry.timesheet_code_id == code_id, Entry.user_id == user_id))
    session.commit()
    return removed


def delete_code(session: Session, user_id: int, code_id: int) -> None:
    """Delete a code visible to the user.

    A real code's in-use guard checks the whole Organization: any member's Entry or virtual code
    depending on it blocks the deletion, not just the acting user's (BIZ-030).

    The other two references to a code are cleaned up rather than blocking, matching the domain:
    Tasks referencing the code are orphaned (``timesheet_code_id`` reset to ``None`` — orphan Tasks
    are explicitly allowed, see the Task model), and its ChecklistMarks (per-period derived ticks,
    meaningless without the code) are removed. Both prevent the foreign-key violation that would
    otherwise crash the deletion.
    """
    code = get_visible_code(session, user_id, code_id)
    blocking = blocking_entries(session, user_id, code_id)
    if blocking.total:
        raise ValidationError(f"Code {code.number} cannot be deleted: {blocking.describe()}")
    if not code.is_virtual:
        virtual_children = session.scalar(
            select(func.count()).select_from(TimesheetCode).where(TimesheetCode.real_code_id == code_id)
        )
        if virtual_children:
            raise ValidationError(f"Code {code.number} has virtual codes pointing to it and cannot be deleted.")
    # A virtual code's backing real code is captured before deletion so a now-orphaned *hidden*
    # backing (BIZ-075, ADR-0014) can be garbage-collected — it only ever existed to back this code.
    backing_id = code.real_code_id if code.is_virtual else None
    session.execute(update(Task).where(Task.timesheet_code_id == code_id).values(timesheet_code_id=None))
    session.execute(delete(ChecklistMark).where(ChecklistMark.timesheet_code_id == code_id))
    session.delete(code)
    session.commit()
    if backing_id is not None:
        _cleanup_orphan_backing(session, backing_id)


def _cleanup_orphan_backing(session: Session, backing_id: int) -> None:
    """Delete a backing-only real code once its last virtual child is gone (BIZ-075, ADR-0014).

    A no-op unless the code is ``backing_only`` with no remaining virtual children and no Entries — a
    visible real code, or one still backing another virtual, is left untouched.
    """
    backing = session.get(TimesheetCode, backing_id)
    if backing is None or not backing.backing_only:
        return
    remaining = session.scalar(
        select(func.count()).select_from(TimesheetCode).where(TimesheetCode.real_code_id == backing_id)
    )
    entries = session.scalar(select(func.count()).select_from(Entry).where(Entry.timesheet_code_id == backing_id))
    if remaining or entries:
        return
    session.execute(delete(ChecklistMark).where(ChecklistMark.timesheet_code_id == backing_id))
    session.delete(backing)
    session.commit()


def parse_catalog_csv(text: str) -> list[ParsedCode]:
    """Parse a hierarchical catalog CSV, grouped by ``code_number`` (one row per code × activity).

    Three layouts are accepted:

    * **Enriched headered** (BIZ-068) — first row is
      ``code_number,code_label,code_name,customer,code_type,activity_code,activity_label``; carries
      the T&E grid-ordering keys (``customer`` client name, ``code_type`` single char C/N/A).
    * **Headered** — first row is ``code_number,code_label,code_name,activity_code,activity_label``
      (``customer``/``code_type`` default to ``None``).
    * **Headerless export** — four columns
      ``code_number,code_label,activity_code,activity_label`` (``code_name`` defaults to
      ``code_label``); quoted fields may contain commas.

    Raises ``CatalogImportError`` on an empty file or one with no codes.
    """
    rows = [row for row in csv.reader(io.StringIO(text.lstrip("\ufeff"))) if row]
    if not rows:
        raise CatalogImportError("The import file is empty.")

    header = [cell.strip().lower() for cell in rows[0]]
    enriched = header == _ENRICHED_COLUMNS
    headered = header == _REQUIRED_COLUMNS
    data_rows = rows[1:] if (enriched or headered) else rows
    min_columns = 7 if enriched else 5 if headered else 4

    codes: dict[str, ParsedCode] = {}
    for row in data_rows:
        if len(row) < min_columns:
            continue
        number = row[0].strip()
        if not number:
            continue
        label = row[1].strip()
        customer: str | None = None
        code_type: str | None = None
        if enriched:
            name = row[2].strip() or label
            customer = row[3].strip() or None
            code_type = (row[4].strip().upper()[:1]) or None
            activity_code = row[5].strip()
            activity_label = ",".join(row[6:]).strip()
        elif headered:
            name = row[2].strip() or label
            activity_code = row[3].strip()
            activity_label = ",".join(row[4:]).strip()
        else:
            name = label
            activity_code = row[2].strip()
            activity_label = ",".join(row[3:]).strip()

        parsed = codes.get(number)
        if parsed is None:
            parsed = ParsedCode(number=number, label=label, name=name, customer=customer, code_type=code_type)
            codes[number] = parsed
        if activity_code or activity_label:
            parsed.activities.append(ParsedActivity(code=activity_code, label=activity_label))

    if not codes:
        raise CatalogImportError("No codes found in the import file.")
    return list(codes.values())
