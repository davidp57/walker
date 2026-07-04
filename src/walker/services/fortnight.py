"""Fortnight aggregation — real minutes into the Timesheet-system Code × Activity × Day grid (BIZ-004, ADR-0008).

Web-independent. No rounding and no target (ADR-0005): cells are exact summed minutes. Only
completed, categorized entries (code + activity, ``end_minute`` set) contribute.
"""

from __future__ import annotations

import calendar
from dataclasses import dataclass
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from walker.models import Entry, TimesheetCode


@dataclass
class FortnightRow:
    """One Code × Activity row: minutes summed per day-of-month."""

    timesheet_code_id: int
    activity: str
    minutes_by_day: dict[int, int]


@dataclass
class FortnightGrid:
    """The aggregated grid for a fortnight window."""

    start: date
    end: date
    rows: list[FortnightRow]


def fortnight_bounds(on: date) -> tuple[date, date]:
    """Return the (start, end) of the fortnight containing ``on``: 1st–15th or 16th–end of month."""
    if on.day <= 15:
        return date(on.year, on.month, 1), date(on.year, on.month, 15)
    last_day = calendar.monthrange(on.year, on.month)[1]
    return date(on.year, on.month, 16), date(on.year, on.month, last_day)


def aggregate_fortnight(session: Session, user_id: int, on: date) -> FortnightGrid:
    """Aggregate a user's entries into the Code × Activity × Day grid for ``on``'s fortnight."""
    start, end = fortnight_bounds(on)
    entries = session.scalars(
        select(Entry).where(
            Entry.user_id == user_id,
            Entry.date >= start,
            Entry.date <= end,
            Entry.end_minute.is_not(None),
            Entry.timesheet_code_id.is_not(None),
        )
    ).all()

    cells: dict[tuple[int, str], dict[int, int]] = {}
    for entry in entries:
        code_id = entry.timesheet_code_id
        end_minute = entry.end_minute
        if not entry.activity or code_id is None or end_minute is None:
            continue
        minutes = max(0, end_minute - entry.start_minute)
        by_day = cells.setdefault((code_id, entry.activity), {})
        by_day[entry.date.day] = by_day.get(entry.date.day, 0) + minutes

    rows = [
        FortnightRow(timesheet_code_id=code_id, activity=activity, minutes_by_day=by_day)
        for (code_id, activity), by_day in cells.items()
    ]
    return FortnightGrid(start=start, end=end, rows=rows)


def resolve_to_real_codes(session: Session, grid: FortnightGrid) -> FortnightGrid:
    """Collapse virtual-code rows into their real code (ADR-0008): Timesheet-system-facing aggregation only.

    Several virtual codes sharing one real code merge into a single ``(real code, activity)`` row,
    with per-day minutes summed exactly (no rounding, ADR-0005) — matching what is keyed into the
    Timesheet system.
    Real codes without virtuals pass through unchanged. Code ids are read straight off the grid, so
    no extra ``user_id`` scoping is needed here.
    """
    code_ids = {row.timesheet_code_id for row in grid.rows}
    real_code_by_id = {
        code.id: (code.real_code_id or code.id)
        for code in session.scalars(select(TimesheetCode).where(TimesheetCode.id.in_(code_ids)))
    }

    cells: dict[tuple[int, str], dict[int, int]] = {}
    for row in grid.rows:
        resolved_id = real_code_by_id.get(row.timesheet_code_id, row.timesheet_code_id)
        by_day = cells.setdefault((resolved_id, row.activity), {})
        for day, minutes in row.minutes_by_day.items():
            by_day[day] = by_day.get(day, 0) + minutes

    rows = [
        FortnightRow(timesheet_code_id=code_id, activity=activity, minutes_by_day=by_day)
        for (code_id, activity), by_day in cells.items()
    ]
    return FortnightGrid(start=grid.start, end=grid.end, rows=rows)
