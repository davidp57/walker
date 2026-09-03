"""Unit tests for the switch-blocks targets (BIZ-093, ADR-0016).

The band composes two sources that behave differently — the habit ranking of ADR-0015 for
*selection*, plain recency to top the list up — then collapses pairs to codes and sorts by name.
Each of those rules gets its own case, because a wrong band still looks plausible.

All dates are anchored on Wednesday 2026-07-29, like the likely-codes tests.
"""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy.orm import Session

from walker.models import User
from walker.services import switch_targets as svc
from walker.services.catalog import ParsedActivity, create_code, set_obsolete
from walker.services.entries import create_entry

WEDNESDAY_0930 = datetime(2026, 7, 29, 9, 30)
WEDNESDAYS = [date(2026, 7, 22), date(2026, 7, 15), date(2026, 7, 8), date(2026, 7, 1)]


def _at(hour: int, minute: int = 0) -> int:
    return hour * 60 + minute


def _user(session: Session) -> int:
    user = User(username="me")
    session.add(user)
    session.commit()
    session.refresh(user)
    return user.id


def _code(
    session: Session,
    uid: int,
    number: str,
    *,
    name: str | None = None,
    activities: tuple[str, ...] = ("Dev",),
    backing_only: bool = False,
) -> int:
    code = create_code(
        session,
        uid,
        number=number,
        label=f"label {number}",
        name=name if name is not None else f"name {number}",
        color="#112233",
        activities=[
            ParsedActivity(code=f"{index:04d}", label=label) for index, label in enumerate(activities, start=1)
        ],
        backing_only=backing_only,
    )
    return code.id


def _used(
    session: Session,
    uid: int,
    code_id: int | None,
    *,
    on: date,
    at: int,
    activity: str | None = "Dev",
    minutes: int = 30,
) -> None:
    create_entry(
        session,
        uid,
        on_date=on,
        start_minute=at,
        end_minute=at + minutes,
        timesheet_code_id=code_id,
        activity=activity,
    )


def test_a_habit_pair_becomes_a_block_carrying_its_activity_as_the_default(session: Session) -> None:
    uid = _user(session)
    code = _code(session, uid, "N9/1", activities=("Dev", "Mgmt"))
    for day in WEDNESDAYS[:3]:
        _used(session, uid, code, on=day, at=_at(9, 5), activity="Mgmt")

    targets = svc.switch_targets(session, uid, at=WEDNESDAY_0930, limit=4)

    assert [t.code.id for t in targets] == [code]
    # The click starts on the ranked activity, not on the code's first one.
    assert targets[0].activity == "Mgmt"
    # The hover menu offers every selectable activity, in catalog order.
    assert targets[0].activities == ["Dev", "Mgmt"]


def test_two_activities_of_one_code_collapse_into_a_single_block(session: Session) -> None:
    uid = _user(session)
    code = _code(session, uid, "N9/1", activities=("Dev", "Mgmt"))
    other = _code(session, uid, "N9/2")
    for day in WEDNESDAYS[:3]:
        _used(session, uid, code, on=day, at=_at(9, 5), activity="Dev")
        _used(session, uid, code, on=day, at=_at(9, 40), activity="Mgmt")
        _used(session, uid, other, on=day, at=_at(10, 0))

    targets = svc.switch_targets(session, uid, at=WEDNESDAY_0930, limit=4)

    assert [t.code.id for t in targets] == [code, other]


def test_blocks_are_sorted_by_code_name_not_by_habit_score(session: Session) -> None:
    """Positions must not move with the hour — only the band's contents may (BIZ-093)."""
    uid = _user(session)
    strong = _code(session, uid, "N9/1", name="zulu")
    weak = _code(session, uid, "N9/2", name="alpha")
    for day in WEDNESDAYS:
        _used(session, uid, strong, on=day, at=_at(9, 30))
    for day in WEDNESDAYS[:2]:
        _used(session, uid, weak, on=day, at=_at(9, 30))

    targets = svc.switch_targets(session, uid, at=WEDNESDAY_0930, limit=4)

    assert [t.code.name for t in targets] == ["alpha", "zulu"]


def test_recently_used_pairs_top_up_a_band_the_habit_model_cannot_fill(session: Session) -> None:
    """Below MIN_SCORE the ranking says nothing; the band stays full anyway (BIZ-093, ADR-0016)."""
    uid = _user(session)
    habit = _code(session, uid, "N9/1", name="habit")
    yesterday = _code(session, uid, "N9/2", name="yesterday")
    older = _code(session, uid, "N9/3", name="older")
    _code(session, uid, "N9/4", name="never used")
    for day in WEDNESDAYS:
        _used(session, uid, habit, on=day, at=_at(9, 30))
    # A single touch each: far under the habit threshold, so only recency can surface them.
    _used(session, uid, yesterday, on=date(2026, 7, 28), at=_at(16, 0))
    _used(session, uid, older, on=date(2026, 7, 20), at=_at(16, 0))

    targets = svc.switch_targets(session, uid, at=WEDNESDAY_0930, limit=3)

    assert {t.code.name for t in targets} == {"habit", "yesterday", "older"}
    assert [t.code.name for t in targets] == ["habit", "older", "yesterday"]


def test_the_fill_prefers_the_most_recently_used_when_the_band_is_too_small(session: Session) -> None:
    uid = _user(session)
    recent = _code(session, uid, "N9/1", name="recent")
    stale = _code(session, uid, "N9/2", name="stale")
    _used(session, uid, recent, on=date(2026, 7, 28), at=_at(16, 0))
    _used(session, uid, stale, on=date(2026, 6, 2), at=_at(16, 0))

    targets = svc.switch_targets(session, uid, at=WEDNESDAY_0930, limit=1)

    assert [t.code.name for t in targets] == ["recent"]


def test_the_running_code_is_excluded_without_shrinking_the_band(session: Session) -> None:
    """Changing activity on the running code goes through the picker — the block is gone (Q19)."""
    uid = _user(session)
    running = _code(session, uid, "N9/1", name="running")
    other = _code(session, uid, "N9/2", name="other")
    for day in WEDNESDAYS:
        _used(session, uid, running, on=day, at=_at(9, 30))
    _used(session, uid, other, on=date(2026, 7, 28), at=_at(16, 0))

    targets = svc.switch_targets(session, uid, at=WEDNESDAY_0930, limit=1, exclude_code_id=running)

    assert [t.code.name for t in targets] == ["other"]


def test_a_user_with_no_history_at_all_gets_no_band(session: Session) -> None:
    uid = _user(session)
    _code(session, uid, "N9/1")

    assert svc.switch_targets(session, uid, at=WEDNESDAY_0930, limit=4) == []


def test_the_fill_never_proposes_what_a_picker_would_refuse(session: Session) -> None:
    """Retired, backing-only and uncategorized history must not leak in through the recency fill."""
    uid = _user(session)
    retired = _code(session, uid, "N9/1", name="retired")
    backing = _code(session, uid, "N9/2", name="backing", backing_only=True)
    good = _code(session, uid, "N9/3", name="good")
    _used(session, uid, retired, on=date(2026, 7, 28), at=_at(9, 0))
    _used(session, uid, backing, on=date(2026, 7, 28), at=_at(10, 0))
    _used(session, uid, None, on=date(2026, 7, 28), at=_at(11, 0), activity=None)
    _used(session, uid, good, on=date(2026, 7, 28), at=_at(12, 0))
    set_obsolete(session, uid, retired, obsolete=True)

    targets = svc.switch_targets(session, uid, at=WEDNESDAY_0930, limit=4)

    assert [t.code.name for t in targets] == ["good"]


def test_an_activity_dropped_from_the_catalog_stops_being_a_default(session: Session) -> None:
    """History outlives a re-import: a block must never default to an activity the picker lost."""
    uid = _user(session)
    code = _code(session, uid, "N9/1", activities=("Dev", "Mgmt"))
    _used(session, uid, code, on=date(2026, 7, 28), at=_at(9, 0), activity="Gone")

    targets = svc.switch_targets(session, uid, at=WEDNESDAY_0930, limit=4)

    assert targets == []


def test_a_zero_limit_asks_nothing_of_the_database(session: Session) -> None:
    uid = _user(session)
    code = _code(session, uid, "N9/1")
    _used(session, uid, code, on=date(2026, 7, 28), at=_at(9, 0))

    assert svc.switch_targets(session, uid, at=WEDNESDAY_0930, limit=0) == []
