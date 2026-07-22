"""Unit tests for insert_break — punching a hole in an entry (BIZ-076)."""

from __future__ import annotations

from datetime import date

import pytest
from sqlalchemy.orm import Session

from walker.exceptions import ValidationError
from walker.models import User
from walker.services import entries as svc

DAY = date(2026, 7, 2)


def _user_id(session: Session) -> int:
    user = User(username="me")
    session.add(user)
    session.commit()
    session.refresh(user)
    return user.id


def _completed(session: Session, uid: int, start: int, end: int) -> int:
    entry = svc.create_entry(
        session, uid, on_date=DAY, start_minute=start, end_minute=end, activity="Dev", description="work"
    )
    return entry.id


def test_break_in_the_middle_splits_into_two_segments(session: Session) -> None:
    uid = _user_id(session)
    _completed(session, uid, 540, 780)  # 09:00–13:00

    svc.insert_break(session, uid, _entry_only(session, uid), break_start=720, break_end=740, now_minute=900)

    spans = [(e.start_minute, e.end_minute) for e in svc.list_entries(session, uid, DAY)]
    assert spans == [(540, 720), (740, 780)]  # 12:00–12:20 hole left untracked
    assert all(e.activity == "Dev" and e.description == "work" for e in svc.list_entries(session, uid, DAY))


def test_break_at_the_start_just_trims_the_start(session: Session) -> None:
    uid = _user_id(session)
    eid = _completed(session, uid, 540, 780)

    svc.insert_break(session, uid, eid, break_start=540, break_end=560, now_minute=900)

    spans = [(e.start_minute, e.end_minute) for e in svc.list_entries(session, uid, DAY)]
    assert spans == [(560, 780)]


def test_break_at_the_end_just_trims_the_end(session: Session) -> None:
    uid = _user_id(session)
    eid = _completed(session, uid, 540, 780)

    svc.insert_break(session, uid, eid, break_start=760, break_end=780, now_minute=900)

    spans = [(e.start_minute, e.end_minute) for e in svc.list_entries(session, uid, DAY)]
    assert spans == [(540, 760)]


def test_break_over_the_whole_entry_removes_it(session: Session) -> None:
    uid = _user_id(session)
    eid = _completed(session, uid, 540, 780)

    svc.insert_break(session, uid, eid, break_start=540, break_end=780, now_minute=900)

    assert svc.list_entries(session, uid, DAY) == []


def test_categorized_hole_creates_an_entry_in_the_gap(session: Session) -> None:
    uid = _user_id(session)
    eid = _completed(session, uid, 540, 780)

    svc.insert_break(
        session, uid, eid, break_start=720, break_end=740, now_minute=900, activity="Lunch", description="déjeuner"
    )

    entries = svc.list_entries(session, uid, DAY)
    spans = [(e.start_minute, e.end_minute, e.activity) for e in entries]
    assert spans == [(540, 720, "Dev"), (720, 740, "Lunch"), (740, 780, "Dev")]


def test_break_in_a_running_entry_keeps_the_timer_running_from_the_break_end(session: Session) -> None:
    uid = _user_id(session)
    svc.start_timer(session, uid, DAY, 540)  # running since 09:00
    running = svc.running_entry(session, uid)
    assert running is not None

    # At 13:00 (now=780) carve a past lunch 12:00–12:20.
    svc.insert_break(session, uid, running.id, break_start=720, break_end=740, now_minute=780)

    entries = svc.list_entries(session, uid, DAY)
    spans = [(e.start_minute, e.end_minute) for e in entries]
    assert spans == [(540, 720), (740, None)]  # before completed, timer continues from 12:20
    still_running = svc.running_entry(session, uid)
    assert still_running is not None and still_running.start_minute == 740


def test_break_out_of_range_is_rejected(session: Session) -> None:
    uid = _user_id(session)
    eid = _completed(session, uid, 540, 780)

    with pytest.raises(ValidationError):
        svc.insert_break(session, uid, eid, break_start=500, break_end=560, now_minute=900)  # before start
    with pytest.raises(ValidationError):
        svc.insert_break(session, uid, eid, break_start=760, break_end=800, now_minute=900)  # after end
    with pytest.raises(ValidationError):
        svc.insert_break(session, uid, eid, break_start=700, break_end=700, now_minute=900)  # empty


def test_break_in_running_entry_cannot_extend_past_now(session: Session) -> None:
    uid = _user_id(session)
    svc.start_timer(session, uid, DAY, 540)
    running = svc.running_entry(session, uid)
    assert running is not None

    with pytest.raises(ValidationError):
        svc.insert_break(session, uid, running.id, break_start=700, break_end=800, now_minute=780)


def _entry_only(session: Session, uid: int) -> int:
    """The id of the single entry on DAY (helper for the split test)."""
    entries = svc.list_entries(session, uid, DAY)
    assert len(entries) == 1
    return entries[0].id
