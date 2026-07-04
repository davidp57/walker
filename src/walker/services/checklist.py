"""Entry-checklist domain logic (BIZ-005, ADR-0005, ADR-0008, ADR-0009).

Web-independent. Checklist items are derived from the Timesheet period grid, **resolved to real
codes** (ADR-0008: virtual codes collapse into the real code they borrow their number/label/
activities from) — one item per non-empty ``(real code, activity, day)`` cell — and each carries an
"entered into T&E" tick persisted as a ``ChecklistMark``. Re-deriving after grid edits keeps ticks
for unchanged lines. The period's shape is read from the user's ``Settings.period_scheme``
(ADR-0009).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from walker.models import ChecklistMark
from walker.services.period import aggregate_period, period_bounds, resolve_to_real_codes
from walker.services.settings import get_settings


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
    """The full checklist for a Timesheet period, with progress counts."""

    items: list[ChecklistItem]
    entered: int
    total: int


def _marks(session: Session, user_id: int, period_start: date) -> list[ChecklistMark]:
    return list(
        session.scalars(
            select(ChecklistMark).where(
                ChecklistMark.user_id == user_id,
                ChecklistMark.period_start == period_start,
            )
        )
    )


def derive_checklist(session: Session, user_id: int, on: date) -> ChecklistResult:
    """Build the checklist from the Timesheet period grid resolved to real codes, applying ticks.

    Virtual codes sharing a real code collapse into one line (ADR-0008): T&E only accepts real
    codes, so several fine-grained Walker rows become one real-code/activity/day line here. The
    period scheme is read from the user's ``Settings`` (ADR-0009).
    """
    scheme = get_settings(session, user_id).period_scheme
    grid = resolve_to_real_codes(session, aggregate_period(session, user_id, scheme, on))
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
    scheme = get_settings(session, user_id).period_scheme
    start, _ = period_bounds(scheme, on)
    mark = session.scalar(
        select(ChecklistMark).where(
            ChecklistMark.user_id == user_id,
            ChecklistMark.period_start == start,
            ChecklistMark.timesheet_code_id == timesheet_code_id,
            ChecklistMark.activity == activity,
            ChecklistMark.day == day,
        )
    )
    if mark is None:
        mark = ChecklistMark(
            user_id=user_id,
            period_start=start,
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
    """Clear every tick for the Timesheet period."""
    scheme = get_settings(session, user_id).period_scheme
    start, _ = period_bounds(scheme, on)
    for mark in _marks(session, user_id, start):
        session.delete(mark)
    session.commit()
    return derive_checklist(session, user_id, on)
