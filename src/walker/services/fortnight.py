"""Fortnight aggregation — real minutes into the T&E Code × Activity × Day grid (BIZ-004).

Web-independent. No rounding and no target (ADR-0005): cells are exact summed minutes. Only
completed, categorized entries (code + activity, ``end_minute`` set) contribute.
"""

from __future__ import annotations

import calendar
from dataclasses import dataclass
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from walker.models import Entry


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
