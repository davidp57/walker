"""Per-code time totals over an arbitrary date range (BIZ-089).

Web-independent. Deliberately **not** part of ``services/period.py``: every aggregation there derives
its window from ``period_bounds(scheme, on)`` and is shaped as the Code × Activity × Day matrix the
Timesheet system wants. This module answers a different question — *"how much time did you spend on
X?"* — over any span, or over all time, for one code.

Two rules follow from ADR-0008 and ADR-0005 respectively:

- A **virtual code reports its own** time rather than collapsing into its backing real code.
  ``period.resolve_to_real_codes`` exists for the Timesheet-facing view; this is the opposite use
  case, where the user asks about the fine-grained thing they named. A *real* code additionally
  offers a roll-up including its virtual children, because "time on this project" legitimately means
  both things depending on who is asking — the two are returned side by side, never merged.
- Minutes are **exact**. No rounding, no targets.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from sqlalchemy import ColumnElement, func, select
from sqlalchemy.orm import Session

from walker.exceptions import ValidationError
from walker.models import Entry, TimesheetCode
from walker.services.catalog import get_visible_code


@dataclass(frozen=True)
class ActivityTotal:
    """One activity's share of a code's time. ``activity`` is ``None`` for code-only entries."""

    activity: str | None
    minutes: int
    entries: int


@dataclass(frozen=True)
class Totals:
    """A bare (minutes, entries, distinct days) triple — used for both the code and its roll-up."""

    minutes: int
    entries: int
    days: int


@dataclass(frozen=True)
class CodeTotals:
    """How much time a user spent on one code over ``[start, end]`` (both optional = all time)."""

    code_id: int
    start: date | None
    end: date | None
    minutes: int
    entries: int
    days: int
    by_activity: list[ActivityTotal]
    # True when the user's timer is running on this code right now. Running time is excluded from the
    # totals (an unfinished entry has no duration yet, as in ``aggregate_period``) — surfaced so the
    # caller can say so rather than silently under-reporting.
    running: bool
    # For a real code with virtual children: the same totals including their time. ``None`` for a
    # virtual code, and for a real code nothing points at — there would be nothing to add.
    rollup: Totals | None


def _window(code_ids: list[int], user_id: int, start: date | None, end: date | None) -> ColumnElement[bool]:
    """Completed entries of ``user_id`` on any of ``code_ids``, inside the (inclusive) window."""
    clause = (
        Entry.user_id == user_id,
        Entry.timesheet_code_id.in_(code_ids),
        Entry.end_minute.is_not(None),
    )
    conditions = list(clause)
    if start is not None:
        conditions.append(Entry.date >= start)
    if end is not None:
        conditions.append(Entry.date <= end)
    combined = conditions[0]
    for condition in conditions[1:]:
        combined = combined & condition
    return combined


def _totals(session: Session, code_ids: list[int], user_id: int, start: date | None, end: date | None) -> Totals:
    minutes, entries, days = session.execute(
        select(
            func.coalesce(func.sum(Entry.end_minute - Entry.start_minute), 0),
            func.count(),
            func.count(func.distinct(Entry.date)),
        ).where(_window(code_ids, user_id, start, end))
    ).one()
    return Totals(minutes=minutes or 0, entries=entries or 0, days=days or 0)


def code_totals(
    session: Session,
    user_id: int,
    code_id: int,
    *,
    start: date | None = None,
    end: date | None = None,
) -> CodeTotals:
    """Total the user's time on ``code_id`` over ``[start, end]`` — omit both for all time.

    Raises ``NotFoundError`` for a code the user cannot see, and ``ValidationError`` if ``end``
    precedes ``start``.
    """
    code = get_visible_code(session, user_id, code_id)
    if start is not None and end is not None and end < start:
        raise ValidationError(f"Range end {end} is before start {start}.")

    own = _totals(session, [code_id], user_id, start, end)

    breakdown = session.execute(
        select(
            Entry.activity,
            func.coalesce(func.sum(Entry.end_minute - Entry.start_minute), 0),
            func.count(),
        )
        .where(_window([code_id], user_id, start, end))
        .group_by(Entry.activity)
        .order_by(func.sum(Entry.end_minute - Entry.start_minute).desc())
    ).all()

    # A running entry has no duration yet, so it is excluded from every total above; the flag exists
    # so the UI can say "a timer is running on this code" instead of quietly under-reporting.
    running = (
        session.scalar(
            select(func.count())
            .select_from(Entry)
            .where(
                Entry.user_id == user_id,
                Entry.timesheet_code_id == code_id,
                Entry.end_minute.is_(None),
            )
        )
        or 0
    ) > 0

    rollup = None
    if not code.is_virtual:
        children = list(session.scalars(select(TimesheetCode.id).where(TimesheetCode.real_code_id == code_id)))
        if children:
            rollup = _totals(session, [code_id, *children], user_id, start, end)

    return CodeTotals(
        code_id=code_id,
        start=start,
        end=end,
        minutes=own.minutes,
        entries=own.entries,
        days=own.days,
        by_activity=[
            ActivityTotal(activity=activity, minutes=minutes or 0, entries=entries or 0)
            for activity, minutes, entries in breakdown
        ],
        running=running,
        rollup=rollup,
    )
