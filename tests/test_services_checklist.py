"""Unit test for the checklist derivation (BIZ-005)."""

from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session

from walker.models import Entry, TimesheetCode, User
from walker.services.checklist import derive_checklist, toggle_mark


def test_derive_keeps_ticks_after_grid_grows(session: Session) -> None:
    user = User(username="me")
    session.add(user)
    session.commit()
    session.refresh(user)
    code = TimesheetCode(user_id=user.id, number="N9/1", label="L", name="N", color="#111")
    session.add(code)
    session.commit()
    session.refresh(code)
    session.add(
        Entry(
            user_id=user.id,
            date=date(2026, 7, 1),
            start_minute=540,
            end_minute=600,
            timesheet_code_id=code.id,
            activity="Bug fixing",
        )
    )
    session.commit()

    toggle_mark(session, user.id, date(2026, 7, 2), code.id, "Bug fixing", 1, True)

    # The grid grows (day 2 tracked); the day-1 tick must survive.
    session.add(
        Entry(
            user_id=user.id,
            date=date(2026, 7, 2),
            start_minute=540,
            end_minute=600,
            timesheet_code_id=code.id,
            activity="Bug fixing",
        )
    )
    session.commit()

    result = derive_checklist(session, user.id, date(2026, 7, 2))

    assert result.total == 2
    assert {item.day: item.entered for item in result.items} == {1: True, 2: False}
