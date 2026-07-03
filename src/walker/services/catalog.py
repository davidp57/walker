"""Code catalog domain logic: CRUD + hierarchical CSV import (BIZ-002).

Web-independent (must not import from ``walker.api``). Import upserts by ``code_number`` so a
re-import is idempotent; colors are auto-assigned from a palette (not carried by the file).
"""

from __future__ import annotations

import csv
import io
from dataclasses import dataclass, field

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from walker.exceptions import CatalogImportError, NotFoundError, ValidationError
from walker.models import Activity, Entry, TimesheetCode

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


def _count_codes(session: Session, user_id: int) -> int:
    total = session.scalar(select(func.count()).select_from(TimesheetCode).where(TimesheetCode.user_id == user_id))
    return total or 0


def _owned_code(session: Session, user_id: int, code_id: int) -> TimesheetCode:
    code = session.get(TimesheetCode, code_id)
    if code is None or code.user_id != user_id:
        raise NotFoundError(f"Code {code_id} not found.")
    return code


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
    """Create a new code (+ activities). Rejects a duplicate ``number`` for the user."""
    existing = session.scalar(
        select(TimesheetCode).where(TimesheetCode.user_id == user_id, TimesheetCode.number == number)
    )
    if existing is not None:
        raise ValidationError(f"A code with number {number} already exists.")
    code = TimesheetCode(
        user_id=user_id,
        number=number,
        label=label,
        name=name or label,
        color=color or _auto_color(_count_codes(session, user_id)),
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
    """Update a code and replace its activities."""
    code = _owned_code(session, user_id, code_id)
    code.number = number
    code.label = label
    code.name = name or label
    if color:
        code.color = color
    code.activities = [Activity(code=a.code, label=a.label) for a in activities]
    session.commit()
    session.refresh(code)
    return code


def delete_code(session: Session, user_id: int, code_id: int) -> None:
    """Delete a code, unless an Entry references it (server-side guard)."""
    code = _owned_code(session, user_id, code_id)
    references = session.scalar(select(func.count()).select_from(Entry).where(Entry.timesheet_code_id == code_id))
    if references:
        raise ValidationError(f"Code {code.number} is referenced by entries and cannot be deleted.")
    session.delete(code)
    session.commit()


def parse_catalog_csv(text: str) -> list[ParsedCode]:
    """Parse a hierarchical catalog CSV, grouped by ``code_number`` (one row per code × activity).

    Two layouts are accepted:

    * **Headered** — first row is ``code_number,code_label,code_name,activity_code,activity_label``.
    * **Headerless PwC export** — four columns
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
