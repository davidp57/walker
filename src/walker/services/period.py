"""Timesheet period aggregation — real minutes into the T&E Code × Activity × Day grid
(BIZ-004, BIZ-027, ADR-0008, ADR-0009).

Web-independent. No rounding and no target (ADR-0005): cells are exact summed minutes. Only
completed, categorized entries (code + activity, ``end_minute`` set) contribute.

The Timesheet period's shape is configurable per-user (ADR-0009): ``period_bounds`` is a pure
function of a ``PeriodScheme`` and a date, with no dependency on a database session. The three
supported schemes are ``weekly``, ``semi_monthly`` (1st-15th / 16th-end of month — Walker's
original, still-default behavior), and ``monthly``.
"""

from __future__ import annotations

import calendar
from dataclasses import dataclass
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from walker.models import Entry, TimesheetCode
from walker.models.settings import PeriodScheme


@dataclass
class PeriodRow:
    """One Code × Activity row: minutes summed per day-of-month."""

    timesheet_code_id: int
    activity: str
    minutes_by_day: dict[int, int]


@dataclass
class PeriodGrid:
    """The aggregated grid for a Timesheet period window."""

    start: date
    end: date
    rows: list[PeriodRow]


def _weekly_bounds(on: date) -> tuple[date, date]:
    """Return the Monday-Sunday week containing ``on``."""
    start = on - timedelta(days=on.weekday())
    end = start + timedelta(days=6)
    return start, end


def _semi_monthly_bounds(on: date) -> tuple[date, date]:
    """Return the (start, end) of the semi-monthly period containing ``on``: 1st-15th or 16th-end."""
    if on.day <= 15:
        return date(on.year, on.month, 1), date(on.year, on.month, 15)
    last_day = calendar.monthrange(on.year, on.month)[1]
    return date(on.year, on.month, 16), date(on.year, on.month, last_day)


def _monthly_bounds(on: date) -> tuple[date, date]:
    """Return the (start, end) of the calendar month containing ``on``."""
    last_day = calendar.monthrange(on.year, on.month)[1]
    return date(on.year, on.month, 1), date(on.year, on.month, last_day)


def period_bounds(scheme: PeriodScheme, on: date) -> tuple[date, date]:
    """Return the (start, end) of the Timesheet period containing ``on``, per ``scheme``.

    Pure function, no database dependency (ADR-0009): ``weekly`` is Monday-Sunday, ``semi_monthly``
    is the 1st-15th / 16th-end-of-month split (Walker's original, still-default behavior), and
    ``monthly`` is the full calendar month.
    """
    if scheme == "weekly":
        return _weekly_bounds(on)
    if scheme == "monthly":
        return _monthly_bounds(on)
    return _semi_monthly_bounds(on)


def aggregate_period(session: Session, user_id: int, scheme: PeriodScheme, on: date) -> PeriodGrid:
    """Aggregate a user's entries into the Code × Activity × Day grid for ``on``'s Timesheet period."""
    start, end = period_bounds(scheme, on)
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
        PeriodRow(timesheet_code_id=code_id, activity=activity, minutes_by_day=by_day)
        for (code_id, activity), by_day in cells.items()
    ]
    return PeriodGrid(start=start, end=end, rows=rows)


def resolve_to_real_codes(session: Session, grid: PeriodGrid) -> PeriodGrid:
    """Collapse virtual-code rows into their real code (ADR-0008): T&E-facing aggregation only.

    Several virtual codes sharing one real code merge into a single ``(real code, activity)`` row,
    with per-day minutes summed exactly (no rounding, ADR-0005) — matching what is keyed into T&E.
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
        PeriodRow(timesheet_code_id=code_id, activity=activity, minutes_by_day=by_day)
        for (code_id, activity), by_day in cells.items()
    ]
    return PeriodGrid(start=grid.start, end=grid.end, rows=rows)
