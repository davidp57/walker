"""A Timer left running past midnight must not corrupt the day it was tracking (BIZ-091).

Closing a running Entry used to assign the *current* minutes-since-midnight to it without ever
looking at the Entry's own ``date``. A timer started at 10:00 and stopped at 09:02 the next morning
was written as ``start=600, end=542`` — a negative duration that every consumer clamped to zero, so
the tracked work vanished in silence (observed in production on 2026-08-21).

Walker records real minutes and invents none (ADR-0005), so a stale timer is closed at zero minutes
and surfaced to the user rather than being guessed at; see the frontend side of BIZ-091.
"""

from __future__ import annotations

from datetime import date, timedelta

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from walker.exceptions import ValidationError
from walker.models import Entry, Task, User
from walker.services import entries as svc
from walker.services import settings as settings_service
from walker.services import states

DAY = date(2026, 8, 20)
NEXT_DAY = DAY + timedelta(days=1)


def _user_id(session: Session) -> int:
    user = User(username="me")
    session.add(user)
    session.commit()
    session.refresh(user)
    return user.id


def test_stopping_a_timer_the_next_day_does_not_write_todays_minute(session: Session) -> None:
    """The production failure: 10:00 yesterday, Stop at 09:02 today."""
    uid = _user_id(session)
    entry = svc.start_timer(session, uid, DAY, 600)

    stopped = svc.stop_timer(session, uid, NEXT_DAY, 542)

    assert stopped.id == entry.id
    assert stopped.date == DAY  # the entry stays on its own day
    assert stopped.end_minute == 600  # zero minutes, not 542 — no minute from another day
    assert stopped.end_minute >= stopped.start_minute


def test_stopping_a_timer_the_same_day_records_the_real_minute(session: Session) -> None:
    uid = _user_id(session)
    svc.start_timer(session, uid, DAY, 600)

    stopped = svc.stop_timer(session, uid, DAY, 630)

    assert stopped.end_minute == 630


def test_stopping_before_the_start_on_the_same_day_is_clamped(session: Session) -> None:
    """A backwards wall clock (DST, a corrected system time) must not produce a negative duration."""
    uid = _user_id(session)
    svc.start_timer(session, uid, DAY, 600)

    stopped = svc.stop_timer(session, uid, DAY, 540)

    assert stopped.end_minute == 600


def test_switching_the_next_day_closes_the_stale_entry_and_opens_one_on_today(session: Session) -> None:
    uid = _user_id(session)
    stale = svc.start_timer(session, uid, DAY, 600)

    fresh = svc.switch_timer(session, uid, NEXT_DAY, 542, description="this morning")

    assert (stale.date, stale.end_minute) == (DAY, 600)
    assert (fresh.date, fresh.start_minute, fresh.end_minute) == (NEXT_DAY, 542, None)


def test_completing_the_next_day_closes_at_zero_and_still_marks_the_task_done(session: Session) -> None:
    uid = _user_id(session)
    task_states = settings_service.get_task_states(session, uid)
    task = Task(user_id=uid, title="Huddle", status=states.initial_id(task_states), tags=[])
    session.add(task)
    session.commit()
    session.refresh(task)
    svc.switch_timer(session, uid, DAY, 600, task_id=task.id)

    completed = svc.complete_timer(session, uid, NEXT_DAY, 542)

    assert completed.end_minute == 600
    assert task.status == states.terminal_id(task_states)


def test_stop_all_running_closes_a_stale_timer_at_zero(session: Session) -> None:
    """The graceful-shutdown hook must not stamp the shutdown minute onto an older day either."""
    uid = _user_id(session)
    svc.start_timer(session, uid, DAY, 600)

    closed = svc.stop_all_running(session, NEXT_DAY, 542)

    assert closed == 1
    entry = session.query(Entry).one()
    assert entry.end_minute == 600


def test_the_database_refuses_an_end_before_the_start(session: Session) -> None:
    """The invariant every duration computation assumes, finally enforced."""
    uid = _user_id(session)
    session.add(Entry(user_id=uid, date=DAY, start_minute=600, end_minute=542))

    with pytest.raises(IntegrityError):
        session.commit()
    session.rollback()


def test_create_entry_rejects_an_end_before_the_start(session: Session) -> None:
    uid = _user_id(session)

    with pytest.raises(ValidationError):
        svc.create_entry(session, uid, on_date=DAY, start_minute=600, end_minute=542)


def test_patching_the_end_before_the_start_is_rejected(session: Session) -> None:
    uid = _user_id(session)
    entry = svc.create_entry(session, uid, on_date=DAY, start_minute=600, end_minute=660)

    with pytest.raises(ValidationError):
        svc.patch_entry(session, uid, entry.id, {"end_minute": 542})


def test_patching_the_start_past_the_end_is_rejected(session: Session) -> None:
    """Only the start moves — the resulting pair is still what has to be valid."""
    uid = _user_id(session)
    entry = svc.create_entry(session, uid, on_date=DAY, start_minute=600, end_minute=660)

    with pytest.raises(ValidationError):
        svc.patch_entry(session, uid, entry.id, {"start_minute": 700})


def test_patching_a_running_entrys_start_stays_allowed(session: Session) -> None:
    """A running entry has no end to compare against (BIZ-054 edits its start in place)."""
    uid = _user_id(session)
    entry = svc.start_timer(session, uid, DAY, 600)

    patched = svc.patch_entry(session, uid, entry.id, {"start_minute": 540})

    assert (patched.start_minute, patched.end_minute) == (540, None)
