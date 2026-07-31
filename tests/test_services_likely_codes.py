"""Unit tests for the likely-codes contextual ranking (BIZ-083, ADR-0015).

The scoring rules are invisible to the eye — a wrong order still looks plausible — so each rule of
ADR-0015 gets its own case: one vote per past *day*, the Gaussian on the start minute, the weekday
factor, the window, the exclusion of the context day, and what counts as evidence at all.

All dates are anchored on Wednesday 2026-07-29 as the context.
"""

from __future__ import annotations

from datetime import date, datetime

import pytest
from sqlalchemy.orm import Session

from walker.models import User
from walker.services import likely_codes as svc
from walker.services.catalog import ParsedActivity, create_code
from walker.services.entries import create_entry

WEDNESDAY_0930 = datetime(2026, 7, 29, 9, 30)
WEDNESDAYS = [date(2026, 7, 22), date(2026, 7, 15), date(2026, 7, 8), date(2026, 7, 1)]
TUESDAYS = [date(2026, 7, 28), date(2026, 7, 21), date(2026, 7, 14)]
SUNDAYS = [date(2026, 7, 26), date(2026, 7, 19)]

OTHER_WORKDAY = 0.35  # ADR-0015's weekday factor for a different workday


def _at(hour: int, minute: int = 0) -> int:
    """Minutes since midnight, matching ``Entry.start_minute``."""
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
    activities: tuple[str, ...] = ("Dev",),
    backing_only: bool = False,
) -> int:
    code = create_code(
        session,
        uid,
        number=number,
        label=f"label {number}",
        name=f"name {number}",
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


def test_the_morning_pair_wins_in_the_morning_and_the_afternoon_pair_in_the_afternoon(session: Session) -> None:
    uid = _user(session)
    morning = _code(session, uid, "N9/1")
    afternoon = _code(session, uid, "N9/2")
    for day in WEDNESDAYS[:3]:
        _used(session, uid, morning, on=day, at=_at(9, 5))
        _used(session, uid, afternoon, on=day, at=_at(14, 30))

    at_0930 = svc.likely_codes(session, uid, at=WEDNESDAY_0930)
    at_1400 = svc.likely_codes(session, uid, at=datetime(2026, 7, 29, 14, 0))

    assert [r.code_id for r in at_0930] == [morning]
    assert [r.code_id for r in at_1400] == [afternoon]


def test_the_same_weekday_outranks_the_same_hour_on_another_workday(session: Session) -> None:
    uid = _user(session)
    same = _code(session, uid, "N9/1")
    other = _code(session, uid, "N9/2")
    for day in WEDNESDAYS[:3]:
        _used(session, uid, same, on=day, at=_at(9, 30))
    for day in TUESDAYS:
        _used(session, uid, other, on=day, at=_at(9, 30))

    ranked = svc.likely_codes(session, uid, at=WEDNESDAY_0930)

    assert [r.code_id for r in ranked] == [same, other]
    assert ranked[0].score == pytest.approx(3.0)
    assert ranked[1].score == pytest.approx(3 * OTHER_WORKDAY)


def test_one_choppy_day_casts_a_single_vote(session: Session) -> None:
    """Twelve switches onto a code in one day must not outweigh four separate days of habit."""
    uid = _user(session)
    choppy = _code(session, uid, "N9/1")
    steady = _code(session, uid, "N9/2")
    for minute in range(_at(9, 0), _at(12, 0), 15):
        _used(session, uid, choppy, on=WEDNESDAYS[0], at=minute, minutes=10)
    for day in WEDNESDAYS:
        _used(session, uid, steady, on=day, at=_at(9, 30))

    ranked = svc.likely_codes(session, uid, at=WEDNESDAY_0930)
    scores = {r.code_id: r.score for r in ranked}

    assert scores[choppy] == pytest.approx(1.0)  # its best Entry of that one day, nothing more
    assert scores[steady] == pytest.approx(4.0)
    assert [r.code_id for r in ranked] == [steady, choppy]


def test_a_lone_off_hour_use_stays_below_the_threshold(session: Session) -> None:
    uid = _user(session)
    code_id = _code(session, uid, "N9/1")
    _used(session, uid, code_id, on=WEDNESDAYS[0], at=_at(10, 30))  # an hour off → 0.80

    assert svc.likely_codes(session, uid, at=WEDNESDAY_0930) == []


def test_a_single_perfectly_aligned_day_reaches_the_threshold(session: Session) -> None:
    """The threshold is calibrated on exactly this case: one same-weekday, same-hour day (ADR-0015)."""
    uid = _user(session)
    code_id = _code(session, uid, "N9/1")
    _used(session, uid, code_id, on=WEDNESDAYS[0], at=_at(9, 30))

    ranked = svc.likely_codes(session, uid, at=WEDNESDAY_0930)

    assert [r.code_id for r in ranked] == [code_id]
    assert ranked[0].score == pytest.approx(1.0)


def test_the_context_day_is_never_its_own_evidence(session: Session) -> None:
    """What you just finished must not top the band — same weekday and near hour are automatic."""
    uid = _user(session)
    code_id = _code(session, uid, "N9/1")
    _used(session, uid, code_id, on=WEDNESDAY_0930.date(), at=_at(9, 0))

    assert svc.likely_codes(session, uid, at=WEDNESDAY_0930) == []


def test_evidence_older_than_the_window_is_ignored(session: Session) -> None:
    uid = _user(session)
    code_id = _code(session, uid, "N9/1")
    _used(session, uid, code_id, on=date(2026, 5, 27), at=_at(9, 30))  # nine weeks back

    assert svc.likely_codes(session, uid, at=WEDNESDAY_0930) == []


def test_a_non_workday_context_draws_no_workday_evidence(session: Session) -> None:
    uid = _user(session)
    code_id = _code(session, uid, "N9/1")
    for day in WEDNESDAYS:
        _used(session, uid, code_id, on=day, at=_at(9, 30))

    assert svc.likely_codes(session, uid, at=datetime(2026, 7, 26, 9, 30)) == []  # a Sunday


def test_weekend_evidence_does_not_vote_on_a_workday(session: Session) -> None:
    uid = _user(session)
    code_id = _code(session, uid, "N9/1")
    for day in SUNDAYS:
        _used(session, uid, code_id, on=day, at=_at(9, 30))

    assert svc.likely_codes(session, uid, at=WEDNESDAY_0930) == []


def test_only_closed_and_fully_categorized_entries_are_evidence(session: Session) -> None:
    uid = _user(session)
    running = _code(session, uid, "N9/1")
    no_activity = _code(session, uid, "N9/2")
    for day in WEDNESDAYS:
        _used(session, uid, no_activity, on=day, at=_at(9, 30), activity=None)
        _used(session, uid, None, on=day, at=_at(10, 0), activity=None)  # uncategorized
    create_entry(
        session,
        uid,
        on_date=WEDNESDAYS[0],
        start_minute=_at(9, 30),
        end_minute=None,  # still running
        timesheet_code_id=running,
        activity="Dev",
    )

    assert svc.likely_codes(session, uid, at=WEDNESDAY_0930) == []


def test_a_vanished_activity_or_a_backing_only_code_is_not_proposable(session: Session) -> None:
    uid = _user(session)
    renamed = _code(session, uid, "N9/1", activities=("Dev",))
    backing = _code(session, uid, "N9/2", activities=("Dev",), backing_only=True)
    for day in WEDNESDAYS:
        _used(session, uid, renamed, on=day, at=_at(9, 30), activity="Legacy")  # dropped from the code
        _used(session, uid, backing, on=day, at=_at(9, 30))

    assert svc.likely_codes(session, uid, at=WEDNESDAY_0930) == []


def test_distinct_activities_of_one_code_rank_as_distinct_pairs(session: Session) -> None:
    uid = _user(session)
    code_id = _code(session, uid, "N9/1", activities=("Dev", "Admin"))
    for day in WEDNESDAYS:
        _used(session, uid, code_id, on=day, at=_at(9, 30), activity="Dev")
    for day in WEDNESDAYS[:2]:
        _used(session, uid, code_id, on=day, at=_at(9, 35), activity="Admin")

    ranked = svc.likely_codes(session, uid, at=WEDNESDAY_0930)

    assert [(r.code_id, r.activity) for r in ranked] == [(code_id, "Dev"), (code_id, "Admin")]


def test_limit_caps_the_result(session: Session) -> None:
    uid = _user(session)
    ids = [_code(session, uid, f"N9/{index}") for index in range(4)]
    for offset, code_id in enumerate(ids):
        for day in WEDNESDAYS:
            _used(session, uid, code_id, on=day, at=_at(9, 30) + offset, minutes=1)

    assert len(svc.likely_codes(session, uid, at=WEDNESDAY_0930, limit=2)) == 2


def test_a_limit_of_zero_returns_nothing(session: Session) -> None:
    """Direct callers may ask for zero rows; over HTTP the endpoint requires at least 1 (BIZ-084)."""
    uid = _user(session)
    code_id = _code(session, uid, "N9/1")
    for day in WEDNESDAYS:
        _used(session, uid, code_id, on=day, at=_at(9, 30))

    assert svc.likely_codes(session, uid, at=WEDNESDAY_0930, limit=0) == []


def test_another_users_history_does_not_leak(session: Session) -> None:
    mine = _user(session)
    theirs = User(username="them")
    session.add(theirs)
    session.commit()
    session.refresh(theirs)
    their_code = _code(session, theirs.id, "N9/9")
    for day in WEDNESDAYS:
        _used(session, theirs.id, their_code, on=day, at=_at(9, 30))

    assert svc.likely_codes(session, mine, at=WEDNESDAY_0930) == []
