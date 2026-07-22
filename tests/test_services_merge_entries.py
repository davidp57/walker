"""Unit tests for merge_entries — combining two overlapping same-code entries (BIZ-077)."""

from __future__ import annotations

from datetime import date

import pytest
from sqlalchemy.orm import Session

from walker.exceptions import NotFoundError, ValidationError
from walker.models import User
from walker.services import entries as svc

DAY = date(2026, 7, 2)


def _user_id(session: Session) -> int:
    user = User(username="me")
    session.add(user)
    session.commit()
    session.refresh(user)
    return user.id


def _entry(session: Session, uid: int, start: int, end: int | None, *, activity: str = "Dev", desc: str = "") -> int:
    e = svc.create_entry(
        session, uid, on_date=DAY, start_minute=start, end_minute=end, timesheet_code_id=None, activity=activity
    )
    if desc:
        e.description = desc
        session.commit()
    return e.id


def test_merge_spans_the_union_and_deletes_the_other(session: Session) -> None:
    uid = _user_id(session)
    a = _entry(session, uid, 540, 620)  # 09:00–10:20
    b = _entry(session, uid, 600, 700)  # 10:00–11:40 (overlaps a)

    merged = svc.merge_entries(session, uid, a, b)

    assert (merged.start_minute, merged.end_minute) == (540, 700)
    remaining = svc.list_entries(session, uid, DAY)
    assert [(e.start_minute, e.end_minute) for e in remaining] == [(540, 700)]


def test_merge_keeps_the_earlier_description_or_falls_back(session: Session) -> None:
    uid = _user_id(session)
    a = _entry(session, uid, 540, 620, desc="")  # earlier, empty description
    b = _entry(session, uid, 600, 700, desc="afternoon push")

    merged = svc.merge_entries(session, uid, a, b)

    assert merged.description == "afternoon push"  # fell back to the later one's non-empty text


def test_merge_prefers_the_earlier_non_empty_description(session: Session) -> None:
    uid = _user_id(session)
    a = _entry(session, uid, 540, 620, desc="morning")
    b = _entry(session, uid, 600, 700, desc="afternoon")

    merged = svc.merge_entries(session, uid, a, b)

    assert merged.description == "morning"


def test_merge_rejects_different_code_or_activity(session: Session) -> None:
    uid = _user_id(session)
    a = _entry(session, uid, 540, 620, activity="Dev")
    b = _entry(session, uid, 600, 700, activity="Review")

    with pytest.raises(ValidationError):
        svc.merge_entries(session, uid, a, b)


def test_merge_completed_with_running_keeps_the_timer_running_from_the_earlier_start(session: Session) -> None:
    uid = _user_id(session)
    a = _entry(session, uid, 540, 600)  # completed 09:00–10:00
    running = svc.start_timer(session, uid, DAY, 600)  # timer since 10:00, same (uncategorized) code
    running.activity = "Dev"  # match the completed entry's activity so the merge is allowed
    session.commit()

    merged = svc.merge_entries(session, uid, a, running.id)

    # The running entry survives, still open, now starting at the earlier start.
    assert merged.id == running.id
    assert merged.start_minute == 540
    assert merged.end_minute is None
    still_running = svc.running_entry(session, uid)
    assert still_running is not None and still_running.id == running.id
    assert [e.id for e in svc.list_entries(session, uid, DAY)] == [running.id]  # the completed one is gone


def test_merge_rejects_two_running_entries(session: Session) -> None:
    uid = _user_id(session)
    r1 = svc.start_timer(session, uid, DAY, 540)
    # Force a second open entry directly (the service normally prevents two timers).
    r2 = svc.create_entry(session, uid, on_date=DAY, start_minute=600, end_minute=None, activity=None)

    with pytest.raises(ValidationError):
        svc.merge_entries(session, uid, r1.id, r2.id)


def test_merge_rejects_an_entry_of_another_user(session: Session) -> None:
    uid = _user_id(session)
    other = User(username="other")
    session.add(other)
    session.commit()
    session.refresh(other)
    a = _entry(session, uid, 540, 620)
    theirs = svc.create_entry(session, other.id, on_date=DAY, start_minute=600, end_minute=700, activity="Dev")

    with pytest.raises(NotFoundError):
        svc.merge_entries(session, uid, a, theirs.id)


def test_merge_of_a_nested_entry_keeps_the_outer_span(session: Session) -> None:
    uid = _user_id(session)
    a = _entry(session, uid, 540, 720)  # 09:00–12:00
    b = _entry(session, uid, 600, 660)  # 10:00–11:00, nested inside a

    merged = svc.merge_entries(session, uid, a, b)

    assert (merged.start_minute, merged.end_minute) == (540, 720)
