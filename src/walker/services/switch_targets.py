"""Switch targets — the codes the Switch blocks offer, one click away (BIZ-093, ADR-0016).

Web-independent. Answers "which codes should the Timer bar let me jump to right now", composing two
sources that ADR-0016 keeps deliberately distinct:

* **Selection** — the habit ranking of ``services/likely_codes.py`` (ADR-0015) decides *which* codes
  deserve a block, using the same hour-of-day / weekday model as the picker's band.
* **Fill** — plain recency tops the band up when the habit threshold leaves it short, so the band is
  always full. This is where ADR-0016 parts ways with ADR-0015's "stay quiet when you don't know":
  the blocks are a *destination list*, and a list with holes in it wastes the width it occupies.

Two shapes then separate this from the picker's band: pairs collapse to **codes** (a block shows one
code; its activities live in the block's hover menu), and the result is sorted by **code name**, not
by score — the band's contents follow the hour, its positions must not, because a block is clicked by
position and a shuffled band mis-imputes time.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from walker.models import Entry, TimesheetCode
from walker.models.settings import DEFAULT_SWITCH_COUNT, MAX_SWITCH_COUNT
from walker.services import catalog, likely_codes

__all__ = ["DEFAULT_SWITCH_COUNT", "MAX_SWITCH_COUNT", "SwitchTarget", "switch_targets"]

# How deep the habit ranking is asked to go before recency takes over. Ranked pairs collapse to
# codes, so a band of N codes can need well over N pairs; this ceiling keeps that generous without
# ever ranking the whole catalog.
_RANKED_DEPTH = 4 * MAX_SWITCH_COUNT


@dataclass(frozen=True)
class SwitchTarget:
    """One block: a code, the activity a plain click starts, and every activity its menu offers."""

    code: TimesheetCode
    activity: str
    activities: list[str]


def _selectable(session: Session, user_id: int) -> dict[int, TimesheetCode]:
    """The codes a block may propose, by id.

    Same exclusions as the picker's band (``likely_codes``): ``backing_only`` codes are hidden from
    every picker (ADR-0014) and ``obsolete`` ones were retired precisely to stop being proposed. A
    block that starts a Timer on something the picker refuses would be a hole in the catalog rules.
    """
    return {
        code.id: code for code in catalog.list_codes(session, user_id) if not code.backing_only and not code.obsolete
    }


def _recent_pairs(session: Session, user_id: int) -> list[tuple[int, str]]:
    """Past (code, activity) pairs, most recently worked first.

    Deliberately *not* windowed like the habit model: the fill exists for the cases the model has
    nothing to say about — a fresh install, a return from leave — and an 8-week horizon would empty
    the band in exactly those cases.
    """
    rows = session.execute(
        select(
            Entry.timesheet_code_id,
            Entry.activity,
            func.max(Entry.date).label("last_date"),
            func.max(Entry.start_minute).label("last_start"),
        )
        .where(
            Entry.user_id == user_id,
            Entry.end_minute.is_not(None),
            Entry.timesheet_code_id.is_not(None),
            Entry.activity.is_not(None),
        )
        .group_by(Entry.timesheet_code_id, Entry.activity)
        .order_by(func.max(Entry.date).desc(), func.max(Entry.start_minute).desc())
        .limit(_RANKED_DEPTH)
    ).all()
    return [(row[0], row[1]) for row in rows]


def switch_targets(
    session: Session,
    user_id: int,
    *,
    at: datetime,
    limit: int = DEFAULT_SWITCH_COUNT,
    exclude_code_id: int | None = None,
) -> list[SwitchTarget]:
    """The codes the Switch blocks offer at the moment ``at``, in display order.

    Args:
        session: Database session.
        user_id: Owner of the Entries and of the catalog the blocks are drawn from.
        at: The moment being categorized — "now" from the Timer bar. Feeds the habit ranking.
        limit: How many blocks to return at most; ``0`` (or less) returns nothing without querying,
            which is how the ``switch_count`` preference switches the band off.
        exclude_code_id: The running Timer's code, dropped from the band. It already sits on the bar
            as the Timer chip a few pixels away, so a block for it would be the same code twice;
            changing activity on the code you are already on goes through the picker.

    Returns:
        Up to ``limit`` blocks sorted by code name. Empty when the user has no usable history at all
        — the caller then shows no band rather than an empty one.
    """
    if limit <= 0:
        return []

    codes = _selectable(session, user_id)
    if not codes:
        return []
    activities = {code_id: [a.label for a in code.resolved_activities] for code_id, code in codes.items()}

    def _usable(code_id: int | None, activity: str | None) -> bool:
        if code_id is None or activity is None or code_id == exclude_code_id:
            return False
        return activity in activities.get(code_id, [])

    # Habit first — it decides *which* codes are worth a block. The first activity seen for a code
    # wins as its default, so the click starts on the pair the model actually ranked.
    chosen: dict[int, str] = {}
    for ranked in likely_codes.likely_codes(session, user_id, at=at, limit=_RANKED_DEPTH):
        if len(chosen) >= limit:
            break
        if _usable(ranked.code_id, ranked.activity) and ranked.code_id not in chosen:
            chosen[ranked.code_id] = ranked.activity

    # Then recency, to fill the rest (ADR-0016) — the band stays full even when nothing is a habit.
    if len(chosen) < limit:
        for code_id, activity in _recent_pairs(session, user_id):
            if len(chosen) >= limit:
                break
            if _usable(code_id, activity) and code_id not in chosen:
                chosen[code_id] = activity

    targets = [
        SwitchTarget(code=codes[code_id], activity=activity, activities=activities[code_id])
        for code_id, activity in chosen.items()
    ]
    targets.sort(key=lambda t: (t.code.name.casefold(), t.code.id))
    return targets
