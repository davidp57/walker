"""Recurrence date math — roll-forward for recurring Tasks (BIZ-025).

Web-independent, pure, dependency-injected: ``next_due_date`` takes the rule, the current due
date, the work rhythm, and absences as plain inputs (no database access), so it is deterministic
and directly unit-testable (see lot TASKS PRD, "Recurrence math is a pure, dependency-injected
function"). Reuses the same **Timesheet period** and **work rhythm / Absence** concepts as
``services/period.py`` and ``services/settings.py`` to keep "snapped to working days"
consistent across the app.

Four rule kinds, no RRULE/iCal:

- ``EveryNDaysRule``: due date + N calendar days.
- ``WeeklyRule``: the next occurrence of one of the chosen weekdays.
- ``MonthlyRule``: the same day-of-month next month (clamped to the month's length).
- ``PeriodRelativeRule``: anchored on the *next* semi-monthly Timesheet period's start (1st/16th)
  or end (15th/month-end), offset by N working days, and snapped to a working day.
"""

from __future__ import annotations

import calendar
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Literal

from walker.services.period import period_bounds

RuleKind = Literal["every_n_days", "weekly", "monthly", "period_relative"]


@dataclass(frozen=True)
class EveryNDaysRule:
    """Advance the due date by ``n`` calendar days."""

    n: int
    kind: RuleKind = "every_n_days"

    def __post_init__(self) -> None:
        if self.n <= 0:
            raise ValueError("n must be positive.")


@dataclass(frozen=True)
class WeeklyRule:
    """Advance to the next occurrence of one of ``weekdays`` (Monday=0 .. Sunday=6)."""

    weekdays: list[int]
    kind: RuleKind = "weekly"

    def __post_init__(self) -> None:
        if not self.weekdays:
            raise ValueError("weekdays must not be empty.")
        if any(day < 0 or day > 6 for day in self.weekdays):
            raise ValueError("weekdays must be within 0..6.")


@dataclass(frozen=True)
class MonthlyRule:
    """Advance to ``day`` of the next month, clamped to that month's length."""

    day: int
    kind: RuleKind = "monthly"

    def __post_init__(self) -> None:
        if self.day < 1 or self.day > 31:
            raise ValueError("day must be within 1..31.")


@dataclass(frozen=True)
class PeriodRelativeRule:
    """Anchor on the next semi-monthly period's ``start`` (1st/16th) or ``end`` (15th/month-end).

    ``offset_days`` is a signed number of **working** days applied to the anchor (negative =
    before, positive = after); the result is always snapped to a working day (skipping weekends
    per the work rhythm and any Absence).
    """

    anchor: Literal["start", "end"]
    offset_days: int
    kind: RuleKind = "period_relative"

    def __post_init__(self) -> None:
        if self.anchor not in ("start", "end"):
            raise ValueError("anchor must be 'start' or 'end'.")


RecurrenceRule = EveryNDaysRule | WeeklyRule | MonthlyRule | PeriodRelativeRule


def _is_working_day(on: date, workdays: list[bool], absences: set[date]) -> bool:
    """Return whether ``on`` is a working day: rostered on ``workdays`` and not an Absence.

    ``workdays`` is Sunday-first (index 0 = Sunday .. 6 = Saturday), matching
    ``Settings.workdays`` / ``DEFAULT_WORKDAYS``. Python's ``date.weekday()`` is Monday-first
    (0 = Monday .. 6 = Sunday), so it's remapped here.
    """
    sunday_first_index = (on.weekday() + 1) % 7
    return workdays[sunday_first_index] and on not in absences


def _shift_working_days(start: date, offset: int, workdays: list[bool], absences: set[date]) -> date:
    """Move ``offset`` working days from ``start`` (0 snaps forward to the nearest working day)."""
    step = 1 if offset >= 0 else -1
    remaining = abs(offset)
    current = start
    while remaining > 0:
        current += timedelta(days=step)
        if _is_working_day(current, workdays, absences):
            remaining -= 1
    if offset == 0 and not _is_working_day(current, workdays, absences):
        # Snap backwards to the last working day at/before the anchor (e.g. "last working day
        # before the period ends").
        while not _is_working_day(current, workdays, absences):
            current -= timedelta(days=1)
    return current


def _add_months(on: date, months: int) -> date:
    """Return ``on`` advanced by ``months`` calendar months, day-of-month unchanged."""
    total = on.month - 1 + months
    year = on.year + total // 12
    month = total % 12 + 1
    return date(year, month, on.day)


def _next_every_n_days(rule: EveryNDaysRule, current_due: date) -> date:
    return current_due + timedelta(days=rule.n)


def _next_weekly(rule: WeeklyRule, current_due: date) -> date:
    chosen = sorted(rule.weekdays)
    for delta in range(1, 8):
        candidate = current_due + timedelta(days=delta)
        if candidate.weekday() in chosen:
            return candidate
    raise AssertionError("unreachable: at least one weekday must match within 7 days")


def _next_monthly(rule: MonthlyRule, current_due: date) -> date:
    next_month = _add_months(date(current_due.year, current_due.month, 1), 1)
    last_day = calendar.monthrange(next_month.year, next_month.month)[1]
    return date(next_month.year, next_month.month, min(rule.day, last_day))


def _next_period_relative(
    rule: PeriodRelativeRule,
    current_due: date,
    workdays: list[bool],
    absences: set[date],
) -> date:
    _, current_end = period_bounds("semi_monthly", current_due)
    next_period_anchor_day = current_end + timedelta(days=1)
    next_start, next_end = period_bounds("semi_monthly", next_period_anchor_day)
    anchor = next_start if rule.anchor == "start" else next_end
    return _shift_working_days(anchor, rule.offset_days, workdays, absences)


def next_due_date(
    rule: RecurrenceRule,
    *,
    current_due: date,
    workdays: list[bool],
    absences: set[date],
) -> date:
    """Compute the next due date for a recurring Task, per ``rule``.

    Pure and dependency-injected: ``workdays`` (Sunday-first booleans, see
    ``services/settings.py``) and ``absences`` (a set of dates) are supplied by the caller — no
    database access here.
    """
    if isinstance(rule, EveryNDaysRule):
        return _next_every_n_days(rule, current_due)
    if isinstance(rule, WeeklyRule):
        return _next_weekly(rule, current_due)
    if isinstance(rule, MonthlyRule):
        return _next_monthly(rule, current_due)
    return _next_period_relative(rule, current_due, workdays, absences)


def _require_int(data: dict[str, object], key: str) -> int:
    value = data[key]
    if not isinstance(value, int):
        raise ValueError(f"{key!r} must be an int, got {value!r}.")
    return value


def rule_from_dict(data: dict[str, object]) -> RecurrenceRule:
    """Deserialize the JSON-stored recurrence rule shape into a typed ``RecurrenceRule``."""
    kind = data.get("kind")
    if kind == "every_n_days":
        return EveryNDaysRule(n=_require_int(data, "n"))
    if kind == "weekly":
        weekdays = data["weekdays"]
        if not isinstance(weekdays, list):
            raise ValueError(f"'weekdays' must be a list, got {weekdays!r}.")
        return WeeklyRule(weekdays=[int(day) for day in weekdays])
    if kind == "monthly":
        return MonthlyRule(day=_require_int(data, "day"))
    if kind == "period_relative":
        anchor = data["anchor"]
        offset_days = _require_int(data, "offset_days")
        if anchor == "start":
            return PeriodRelativeRule(anchor="start", offset_days=offset_days)
        if anchor == "end":
            return PeriodRelativeRule(anchor="end", offset_days=offset_days)
        raise ValueError("anchor must be 'start' or 'end'.")
    raise ValueError(f"Unknown recurrence rule kind: {kind!r}.")


def rule_to_dict(rule: RecurrenceRule) -> dict[str, object]:
    """Serialize a ``RecurrenceRule`` back into its JSON-storable shape."""
    if isinstance(rule, EveryNDaysRule):
        return {"kind": "every_n_days", "n": rule.n}
    if isinstance(rule, WeeklyRule):
        return {"kind": "weekly", "weekdays": list(rule.weekdays)}
    if isinstance(rule, MonthlyRule):
        return {"kind": "monthly", "day": rule.day}
    return {"kind": "period_relative", "anchor": rule.anchor, "offset_days": rule.offset_days}
