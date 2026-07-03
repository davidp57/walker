"""Entry-checklist domain logic (BIZ-005, ADR-0005).

Web-independent. Checklist items are derived from the fortnight grid — one per non-empty
``(code, activity, day)`` cell — and each carries an "entered into T&E" tick persisted as a
``ChecklistMark``. Re-deriving after grid edits keeps ticks for unchanged lines.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from walker.models import ChecklistMark
from walker.services.fortnight import aggregate_fortnight, fortnight_bounds


@dataclass
class ChecklistItem:
    """One checklist line: a grid cell plus its entered state."""

    timesheet_code_id: int
    activity: str
    day: int
    minutes: int
    entered: bool


@dataclass
class ChecklistResult:
    """The full checklist for a fortnight, with progress counts."""

    items: list[ChecklistItem]
    entered: int
    total: int


def _marks(session: Session, user_id: int, fortnight_start: date) -> list[ChecklistMark]:
    return list(
        session.scalars(
            select(ChecklistMark).where(
                ChecklistMark.user_id == user_id,
                ChecklistMark.fortnight_start == fortnight_start,
            )
        )
    )


def derive_checklist(session: Session, user_id: int, on: date) -> ChecklistResult:
    """Build the checklist from the fortnight grid, applying persisted ticks."""
    grid = aggregate_fortnight(session, user_id, on)
    ticks = {
        (mark.timesheet_code_id, mark.activity, mark.day): mark.entered for mark in _marks(session, user_id, grid.start)
    }
    items: list[ChecklistItem] = []
    for row in grid.rows:
        for day, minutes in sorted(row.minutes_by_day.items()):
            if minutes <= 0:
                continue
            entered = ticks.get((row.timesheet_code_id, row.activity, day), False)
            items.append(
                ChecklistItem(
                    timesheet_code_id=row.timesheet_code_id,
                    activity=row.activity,
                    day=day,
                    minutes=minutes,
                    entered=entered,
                )
            )
    entered_count = sum(1 for item in items if item.entered)
    return ChecklistResult(items=items, entered=entered_count, total=len(items))


def toggle_mark(
    session: Session,
    user_id: int,
    on: date,
    timesheet_code_id: int,
    activity: str,
    day: int,
    entered: bool,
) -> ChecklistResult:
    """Set the entered state of one ``(code, activity, day)`` cell (idempotent)."""
    start, _ = fortnight_bounds(on)
    mark = session.scalar(
        select(ChecklistMark).where(
            ChecklistMark.user_id == user_id,
            ChecklistMark.fortnight_start == start,
            ChecklistMark.timesheet_code_id == timesheet_code_id,
            ChecklistMark.activity == activity,
            ChecklistMark.day == day,
        )
    )
    if mark is None:
        mark = ChecklistMark(
            user_id=user_id,
            fortnight_start=start,
            timesheet_code_id=timesheet_code_id,
            activity=activity,
            day=day,
            entered=entered,
        )
        session.add(mark)
    else:
        mark.entered = entered
    session.commit()
    return derive_checklist(session, user_id, on)


def reset_checklist(session: Session, user_id: int, on: date) -> ChecklistResult:
    """Clear every tick for the fortnight."""
    start, _ = fortnight_bounds(on)
    for mark in _marks(session, user_id, start):
        session.delete(mark)
    session.commit()
    return derive_checklist(session, user_id, on)
