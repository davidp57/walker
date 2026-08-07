"""Likely codes — contextual ranking of (Timesheet code, Activity) pairs (BIZ-083, ADR-0015).

Web-independent. Answers "which pair do I usually work on around *this* time, on *this* kind of day"
from the user's own past Entries, so the code picker can surface a handful of candidates above its
name-sorted list. The result is a **ranking device only**: it changes display order, never pre-fills
anything, and its scores are deliberately not calibrated as probabilities — do not surface them.

The model, and every alternative that was rejected, is written up in ADR-0015. In short: each past
**day** casts one vote worth that day's best-matching Entry; a vote is a Gaussian on the distance
between start minutes times a weekday factor.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date as date_type
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from walker.models import Entry, TimesheetCode
from walker.models.settings import DEFAULT_LIKELY_COUNT, MAX_LIKELY_COUNT
from walker.services import catalog
from walker.services import settings as settings_service

__all__ = ["DEFAULT_LIKELY_COUNT", "MAX_LIKELY_COUNT", "LikelyCode", "likely_codes", "resolve"]

# --- Model constants (ADR-0015) -------------------------------------------------------------------
# Deliberately hardcoded rather than exposed as settings: these are model internals whose effect a
# user cannot observe, so a knob would only invite endless untestable fiddling. Only the number of
# rows shown is user-configurable (BIZ-084). Tuning any of these is a one-line commit.

# Spread (sigma) of the start-minute kernel. 90 min keeps a 9:15 Entry worth ~0.87 at 10:00 and ~0.14
# at 13:00 — wide enough that 9:29 and 9:31 vote alike (the whole point of being fuzzy), narrow enough
# to separate morning from afternoon.
HOUR_SIGMA_MINUTES = 90.0

# Beyond 3 sigma the vote is under 0.02 — noise that only accumulates, so it is cut to zero outright.
HOUR_CUTOFF_MINUTES = 3 * HOUR_SIGMA_MINUTES

# A day that isn't the same weekday still votes, at reduced weight: 8 weeks give only 8 same-weekday
# samples, too few to stand alone, while the ~32 other workdays carry the "I do this in the morning"
# regularity. Crossing the workday / non-workday boundary votes 0 — a Sunday says nothing about a
# Wednesday, and vice versa.
OTHER_WORKDAY_WEIGHT = 0.35

# How far back evidence is drawn. This window *is* the recency decay (one number instead of a decay
# constant on top of it): a mission that ended three months ago simply falls out of it.
WINDOW_DAYS = 8 * 7

# A pair is only worth showing from one full same-weekday, same-hour day's worth of evidence (or the
# spread-out equivalent). Below that it isn't a habit, it's a coincidence — and a band that stays
# quiet when it has nothing to say is a band the user can trust.
MIN_SCORE = 1.0
# --------------------------------------------------------------------------------------------------

# How many rows the band shows. Unlike the constants above this one *is* user-facing — a directly
# observable quantity — so BIZ-084 made it the ``likely_count`` view preference (0 disabling the
# band). Its default and ceiling therefore live with the other per-user defaults, in
# ``models/settings.py``; re-exported here because this module is where the band's model is read.


@dataclass(frozen=True)
class LikelyCode:
    """One ranked (code, activity) pair. ``score`` orders the list and is never shown to the user."""

    code_id: int
    activity: str
    score: float


def _is_workday(on: date_type, workdays: list[bool]) -> bool:
    """Whether ``on`` is a rostered workday.

    ``workdays`` is Sunday-first (index 0 = Sunday .. 6 = Saturday) per ``Settings.workdays``, while
    Python's ``date.weekday()`` is Monday-first — same remapping as ``services/recurrence.py``.
    Absences are deliberately *not* consulted: an Entry logged on a day off is still evidence of what
    the user did then.
    """
    return workdays[(on.weekday() + 1) % 7]


def _hour_weight(minutes_apart: int) -> float:
    """The Gaussian start-minute kernel, truncated to 0 beyond the cutoff."""
    if minutes_apart >= HOUR_CUTOFF_MINUTES:
        return 0.0
    return math.exp(-(minutes_apart**2) / (2 * HOUR_SIGMA_MINUTES**2))


def _proposable_pairs(session: Session, user_id: int) -> tuple[set[tuple[int, str]], dict[int, str]]:
    """The (code_id, activity label) pairs currently selectable, plus each code's name for tie-breaks.

    Intersecting candidates with the live catalog matters: history holds pairs whose code has since
    left the user's codes and activities that vanished on a re-import. Proposing something the picker
    can't select is worse than proposing nothing. ``backing_only`` codes are excluded — the SPA hides
    them from every picker (BIZ-075, ADR-0014).
    """
    pairs: set[tuple[int, str]] = set()
    names: dict[int, str] = {}
    for code in catalog.list_codes(session, user_id):
        if code.backing_only:
            continue
        names[code.id] = code.name
        pairs.update((code.id, activity.label) for activity in code.resolved_activities)
    return pairs, names


def _evidence(session: Session, user_id: int, *, since: date_type, before: date_type) -> list[Entry]:
    """Closed, fully categorized Entries in ``[since, before)`` — the only rows that count as habit."""
    return list(
        session.scalars(
            select(Entry).where(
                Entry.user_id == user_id,
                Entry.date >= since,
                Entry.date < before,
                Entry.end_minute.is_not(None),
                Entry.timesheet_code_id.is_not(None),
                Entry.activity.is_not(None),
            )
        )
    )


def likely_codes(
    session: Session, user_id: int, *, at: datetime, limit: int = DEFAULT_LIKELY_COUNT
) -> list[LikelyCode]:
    """Rank the user's (code, activity) pairs by habit at the moment ``at``, best first.

    Args:
        session: Database session.
        user_id: Owner of the Entries and of the catalog the results are drawn from.
        at: The moment being categorized — "now" from the Timer, the start time being typed from the
            entry editor. Its date bounds the evidence window and is itself excluded from it.
        limit: Maximum number of pairs returned; ``0`` (or less) returns nothing without querying.
            Note the HTTP endpoint requires at least 1: a disabled band (``likely_count`` 0, BIZ-084)
            is handled by the caller *not asking*, so a request for zero rows is a client bug rather
            than a supported call. This guard is for direct, non-HTTP callers.

    Returns:
        Pairs scoring at least ``MIN_SCORE``, highest first; ties broken by code name then activity so
        the order is stable across calls. Empty when nothing qualifies — the caller shows no band.
    """
    if limit <= 0:
        return []

    context_day = at.date()
    context_minute = at.hour * 60 + at.minute
    workdays = settings_service.get_settings(session, user_id).workdays
    context_is_workday = _is_workday(context_day, workdays)

    proposable, names = _proposable_pairs(session, user_id)
    if not proposable:
        return []

    # One vote per (pair, day), worth that day's best-matching Entry — so a choppy day of switches
    # counts once, which is what makes the unit of measurement a *day* and thus a habit.
    best_vote: dict[tuple[int, str, date_type], float] = {}
    for entry in _evidence(
        session,
        user_id,
        since=context_day - timedelta(days=WINDOW_DAYS),
        before=context_day,
    ):
        # Guaranteed non-null by the query; re-checked so the type checker stays honest.
        if entry.timesheet_code_id is None or entry.activity is None:
            continue
        pair = (entry.timesheet_code_id, entry.activity)
        if pair not in proposable:
            continue
        if _is_workday(entry.date, workdays) != context_is_workday:
            continue
        day_weight = 1.0 if entry.date.weekday() == context_day.weekday() else OTHER_WORKDAY_WEIGHT
        vote = _hour_weight(abs(entry.start_minute - context_minute)) * day_weight
        if vote <= 0.0:
            continue
        key = (*pair, entry.date)
        if vote > best_vote.get(key, 0.0):
            best_vote[key] = vote

    scores: dict[tuple[int, str], float] = {}
    for (code_id, activity, _day), vote in best_vote.items():
        scores[(code_id, activity)] = scores.get((code_id, activity), 0.0) + vote

    ranked = [
        LikelyCode(code_id=code_id, activity=activity, score=score)
        for (code_id, activity), score in scores.items()
        if score >= MIN_SCORE
    ]
    ranked.sort(key=lambda r: (-r.score, names[r.code_id], r.activity))
    return ranked[:limit]


def resolve(session: Session, user_id: int, ranked: list[LikelyCode]) -> list[tuple[TimesheetCode, str]]:
    """Pair each result with its ``TimesheetCode``, preserving rank — for the API layer's payload."""
    codes = {code.id: code for code in catalog.list_codes(session, user_id)}
    return [(codes[r.code_id], r.activity) for r in ranked if r.code_id in codes]
