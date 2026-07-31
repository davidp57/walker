"""Recurrence date math for recurring Tasks (BIZ-025, BIZ-086).

Web-independent, pure, dependency-injected: the rule, the reference date, the Timesheet period
scheme, the work rhythm, and absences are all plain inputs (no database access), so this is
deterministic and directly unit-testable (see lot TASKS PRD, "Recurrence math is a pure,
dependency-injected function"). Reuses the same **Timesheet period** and **work rhythm / Absence**
concepts as ``services/period.py`` and ``services/settings.py`` to keep "snapped to working days"
consistent across the app.

**Two questions, two functions** (BIZ-086): ``next_due_date`` advances *past* a current due date —
the roll-forward when a recurring Task is completed — while ``first_due_date`` gives the first
occurrence *at or after* a date, which is what a rule must be seeded with when it is set. Using the
roll-forward to seed skips the very occurrence the user is waiting for.

Four rule kinds, no RRULE/iCal:

- ``EveryNDaysRule``: due date + N calendar days (no absolute phase — seeding starts the cycle).
- ``WeeklyRule``: the next occurrence of one of the chosen weekdays.
- ``MonthlyRule``: the same day-of-month next month (clamped to the month's length).
- ``PeriodRelativeRule``: anchored on a Timesheet period's start or end — per the **user's** period
  scheme (ADR-0009), not a fixed one — offset by N working days, and snapped to a working day.
"""

from __future__ import annotations

import calendar
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Literal

from walker.models.settings import PeriodScheme
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


def _period_occurrence(
    rule: PeriodRelativeRule,
    period_scheme: PeriodScheme,
    within: date,
    workdays: list[bool],
    absences: set[date],
) -> date:
    """The rule's occurrence for the period containing ``within``."""
    start, end = period_bounds(period_scheme, within)
    anchor = start if rule.anchor == "start" else end
    return _shift_working_days(anchor, rule.offset_days, workdays, absences)


def _next_period_relative(
    rule: PeriodRelativeRule,
    period_scheme: PeriodScheme,
    current_due: date,
    workdays: list[bool],
    absences: set[date],
) -> date:
    _, current_end = period_bounds(period_scheme, current_due)
    return _period_occurrence(rule, period_scheme, current_end + timedelta(days=1), workdays, absences)


def next_due_date(
    rule: RecurrenceRule,
    *,
    period_scheme: PeriodScheme,
    current_due: date,
    workdays: list[bool],
    absences: set[date],
) -> date:
    """Advance a recurring Task **past** ``current_due`` — the roll-forward on completion (BIZ-025).

    Pure and dependency-injected: ``period_scheme`` (ADR-0009), ``workdays`` (Sunday-first booleans,
    see ``services/settings.py``) and ``absences`` (a set of dates) are supplied by the caller — no
    database access here. ``period_scheme`` is deliberately **required**: defaulting it is how it came
    to be hardcoded to ``semi_monthly`` in the first place (BIZ-086), silently ignoring the setting.

    For the *first* occurrence of a rule, use ``first_due_date`` — this function always moves on, so
    seeding with it would skip the occurrence the user is waiting for.
    """
    if isinstance(rule, EveryNDaysRule):
        return _next_every_n_days(rule, current_due)
    if isinstance(rule, WeeklyRule):
        return _next_weekly(rule, current_due)
    if isinstance(rule, MonthlyRule):
        return _next_monthly(rule, current_due)
    return _next_period_relative(rule, period_scheme, current_due, workdays, absences)


def first_due_date(
    rule: RecurrenceRule,
    *,
    period_scheme: PeriodScheme,
    on: date,
    workdays: list[bool],
    absences: set[date],
) -> date:
    """The rule's first occurrence **at or after** ``on`` — the due date to seed a new rule with.

    The counterpart of ``next_due_date``, kept as its own function rather than a flag on that one: the
    two answer different questions ("when does this recur next" vs "when does this first fire"), and a
    boolean argument would put the difference at the call site, where it is easy to get wrong.

    Per rule kind: a period-relative rule takes the **current** period's occurrence when it is still
    ahead, else the next period's; a weekly rule accepts ``on`` itself when the weekday matches; a
    monthly rule takes this month's day when it has not passed; and "every N days" has no absolute
    phase at all, so its cycle simply starts on ``on``.
    """
    if isinstance(rule, EveryNDaysRule):
        return on
    if isinstance(rule, WeeklyRule):
        chosen = sorted(rule.weekdays)
        if on.weekday() in chosen:
            return on
        return _next_weekly(rule, on)
    if isinstance(rule, MonthlyRule):
        last_day = calendar.monthrange(on.year, on.month)[1]
        this_month = date(on.year, on.month, min(rule.day, last_day))
        return this_month if this_month >= on else _next_monthly(rule, on)
    occurrence = _period_occurrence(rule, period_scheme, on, workdays, absences)
    if occurrence >= on:
        return occurrence
    return _next_period_relative(rule, period_scheme, on, workdays, absences)


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
