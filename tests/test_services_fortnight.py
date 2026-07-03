"""Unit tests for the fortnight aggregation service (BIZ-004)."""

from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session

from walker.models import Entry, TimesheetCode, User
from walker.services.fortnight import aggregate_fortnight, fortnight_bounds


def test_bounds_first_half() -> None:
    assert fortnight_bounds(date(2026, 7, 2)) == (date(2026, 7, 1), date(2026, 7, 15))
    assert fortnight_bounds(date(2026, 7, 15)) == (date(2026, 7, 1), date(2026, 7, 15))


def test_bounds_second_half_across_month_lengths() -> None:
    assert fortnight_bounds(date(2026, 7, 16)) == (date(2026, 7, 16), date(2026, 7, 31))  # 31
    assert fortnight_bounds(date(2026, 4, 20)) == (date(2026, 4, 16), date(2026, 4, 30))  # 30
    assert fortnight_bounds(date(2026, 2, 16)) == (date(2026, 2, 16), date(2026, 2, 28))  # 28
    assert fortnight_bounds(date(2024, 2, 20)) == (date(2024, 2, 16), date(2024, 2, 29))  # 29 leap


def _seed(session: Session) -> tuple[int, int]:
    user = User(username="me")
    session.add(user)
    session.commit()
    session.refresh(user)
    code = TimesheetCode(user_id=user.id, number="N9/1", label="L", name="N", color="#111")
    session.add(code)
    session.commit()
    session.refresh(code)
    return user.id, code.id


def test_aggregate_sums_real_minutes_by_code_activity_day(session: Session) -> None:
    user_id, code_id = _seed(session)
    session.add_all(
        [
            Entry(
                user_id=user_id,
                date=date(2026, 7, 1),
                start_minute=540,
                end_minute=600,
                timesheet_code_id=code_id,
                activity="Bug fixing",
            ),
            Entry(
                user_id=user_id,
                date=date(2026, 7, 1),
                start_minute=600,
                end_minute=630,
                timesheet_code_id=code_id,
                activity="Bug fixing",
            ),
            Entry(
                user_id=user_id,
                date=date(2026, 7, 2),
                start_minute=540,
                end_minute=600,
                timesheet_code_id=code_id,
                activity="Bug fixing",
            ),
            Entry(
                user_id=user_id,
                date=date(2026, 7, 1),
                start_minute=540,
                end_minute=600,
                timesheet_code_id=code_id,
                activity=None,
            ),
            Entry(
                user_id=user_id,
                date=date(2026, 7, 1),
                start_minute=540,
                end_minute=None,
                timesheet_code_id=code_id,
                activity="Bug fixing",
            ),
            Entry(
                user_id=user_id,
                date=date(2026, 7, 20),
                start_minute=540,
                end_minute=600,
                timesheet_code_id=code_id,
                activity="Bug fixing",
            ),
        ]
    )
    session.commit()

    grid = aggregate_fortnight(session, user_id, date(2026, 7, 2))

    assert (grid.start, grid.end) == (date(2026, 7, 1), date(2026, 7, 15))
    assert len(grid.rows) == 1
    row = grid.rows[0]
    assert row.timesheet_code_id == code_id
    assert row.activity == "Bug fixing"
    assert row.minutes_by_day == {1: 90, 2: 60}
