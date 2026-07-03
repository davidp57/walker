"""Unit tests for the pure timer/entry service logic (BIZ-003)."""

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


def test_switch_closes_previous_at_the_switch_minute(session: Session) -> None:
    uid = _user_id(session)
    first = svc.start_timer(session, uid, DAY, 540)

    second = svc.switch_timer(session, uid, DAY, 600, description="next task")

    assert first.end_minute == 600
    assert second.start_minute == 600
    assert second.end_minute is None
    running = svc.running_entry(session, uid)
    assert running is not None
    assert running.id == second.id


def test_start_twice_raises(session: Session) -> None:
    uid = _user_id(session)
    svc.start_timer(session, uid, DAY, 540)

    with pytest.raises(ValidationError):
        svc.start_timer(session, uid, DAY, 560)


def test_stop_without_running_raises(session: Session) -> None:
    uid = _user_id(session)

    with pytest.raises(ValidationError):
        svc.stop_timer(session, uid, 600)


def test_stop_all_running_closes_every_running_timer(session: Session) -> None:
    uid = _user_id(session)
    svc.start_timer(session, uid, DAY, 540)

    closed = svc.stop_all_running(session, 600)

    assert closed == 1
    assert svc.running_entry(session, uid) is None
