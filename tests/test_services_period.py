"""Unit tests for the Timesheet period aggregation service (BIZ-004, BIZ-027, ADR-0009)."""

from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session

from walker.models import Entry, TimesheetCode, User
from walker.services.period import (
    PeriodGrid,
    PeriodRow,
    aggregate_period,
    period_bounds,
    resolve_to_real_codes,
)


def test_semi_monthly_bounds_first_half() -> None:
    assert period_bounds("semi_monthly", date(2026, 7, 2)) == (date(2026, 7, 1), date(2026, 7, 15))
    assert period_bounds("semi_monthly", date(2026, 7, 15)) == (date(2026, 7, 1), date(2026, 7, 15))


def test_semi_monthly_bounds_second_half_across_month_lengths() -> None:
    assert period_bounds("semi_monthly", date(2026, 7, 16)) == (date(2026, 7, 16), date(2026, 7, 31))  # 31
    assert period_bounds("semi_monthly", date(2026, 4, 20)) == (date(2026, 4, 16), date(2026, 4, 30))  # 30
    assert period_bounds("semi_monthly", date(2026, 2, 16)) == (date(2026, 2, 16), date(2026, 2, 28))  # 28
    assert period_bounds("semi_monthly", date(2024, 2, 20)) == (date(2024, 2, 16), date(2024, 2, 29))  # 29 leap


def test_weekly_bounds_mid_week() -> None:
    # Wednesday 2026-07-01 -> Monday 2026-06-29 .. Sunday 2026-07-05.
    assert period_bounds("weekly", date(2026, 7, 1)) == (date(2026, 6, 29), date(2026, 7, 5))


def test_weekly_bounds_monday_is_the_start() -> None:
    assert period_bounds("weekly", date(2026, 7, 6)) == (date(2026, 7, 6), date(2026, 7, 12))


def test_weekly_bounds_sunday_is_the_end() -> None:
    assert period_bounds("weekly", date(2026, 7, 12)) == (date(2026, 7, 6), date(2026, 7, 12))


def test_weekly_bounds_crosses_month_boundary() -> None:
    # Friday 2026-07-31 -> week Monday 2026-07-27 .. Sunday 2026-08-02.
    assert period_bounds("weekly", date(2026, 7, 31)) == (date(2026, 7, 27), date(2026, 8, 2))


def test_weekly_bounds_crosses_year_boundary() -> None:
    # Thursday 2026-01-01 -> week Monday 2025-12-29 .. Sunday 2026-01-04.
    assert period_bounds("weekly", date(2026, 1, 1)) == (date(2025, 12, 29), date(2026, 1, 4))


def test_monthly_bounds_short_month() -> None:
    assert period_bounds("monthly", date(2026, 2, 10)) == (date(2026, 2, 1), date(2026, 2, 28))


def test_monthly_bounds_leap_february() -> None:
    assert period_bounds("monthly", date(2024, 2, 10)) == (date(2024, 2, 1), date(2024, 2, 29))


def test_monthly_bounds_31_day_month() -> None:
    assert period_bounds("monthly", date(2026, 7, 1)) == (date(2026, 7, 1), date(2026, 7, 31))
    assert period_bounds("monthly", date(2026, 7, 31)) == (date(2026, 7, 1), date(2026, 7, 31))


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

    grid = aggregate_period(session, user_id, "semi_monthly", date(2026, 7, 2))

    assert (grid.start, grid.end) == (date(2026, 7, 1), date(2026, 7, 15))
    assert len(grid.rows) == 1
    row = grid.rows[0]
    assert row.timesheet_code_id == code_id
    assert row.activity == "Bug fixing"
    assert row.minutes_by_day == {1: 90, 2: 60}


def test_aggregate_flags_a_cell_manual_when_any_entry_is_manual(session: Session) -> None:
    # BIZ-065: a cell is "manual" if it aggregates at least one manual entry; timer-only stays False.
    user_id, code_id = _seed(session)
    session.add_all(
        [
            Entry(
                user_id=user_id,
                date=date(2026, 7, 1),
                start_minute=540,
                end_minute=600,
                timesheet_code_id=code_id,
                activity="A",
                source="timer",
            ),
            Entry(
                user_id=user_id,
                date=date(2026, 7, 1),
                start_minute=600,
                end_minute=630,
                timesheet_code_id=code_id,
                activity="A",
                source="manual",
            ),
            Entry(
                user_id=user_id,
                date=date(2026, 7, 2),
                start_minute=540,
                end_minute=600,
                timesheet_code_id=code_id,
                activity="A",
                source="timer",
            ),
        ]
    )
    session.commit()

    row = aggregate_period(session, user_id, "semi_monthly", date(2026, 7, 2)).rows[0]
    assert row.manual_by_day.get(1) is True  # day 1 mixes a manual entry in
    assert row.manual_by_day.get(2) is False  # day 2 is timer-only


def test_resolve_to_real_codes_or_combines_the_manual_flag(session: Session) -> None:
    # BIZ-065: when a virtual-code row merges into its real code, the manual flag is OR-combined.
    user = User(username="me")
    session.add(user)
    session.commit()
    session.refresh(user)
    real = TimesheetCode(user_id=user.id, number="N9/1", label="L", name="Real", color="#111")
    session.add(real)
    session.commit()
    session.refresh(real)
    virtual = TimesheetCode(
        user_id=user.id, number="N9/1", label="L", name="Virtual", color="#222", real_code_id=real.id
    )
    session.add(virtual)
    session.commit()
    session.refresh(virtual)

    grid = PeriodGrid(
        start=date(2026, 7, 1),
        end=date(2026, 7, 15),
        rows=[
            PeriodRow(real.id, "A", {1: 60}, {1: False}),  # real code, timer-only
            PeriodRow(virtual.id, "A", {1: 30}, {1: True}),  # virtual code, has a manual entry
        ],
    )

    resolved = resolve_to_real_codes(session, grid)
    assert len(resolved.rows) == 1
    row = resolved.rows[0]
    assert row.timesheet_code_id == real.id
    assert row.minutes_by_day == {1: 90}
    assert row.manual_by_day == {1: True}


def test_aggregate_respects_weekly_scheme(session: Session) -> None:
    user_id, code_id = _seed(session)
    session.add_all(
        [
            Entry(
                user_id=user_id,
                date=date(2026, 7, 1),  # Wednesday, in the week of 2026-06-29..2026-07-05
                start_minute=540,
                end_minute=600,
                timesheet_code_id=code_id,
                activity="Bug fixing",
            ),
            Entry(
                user_id=user_id,
                date=date(2026, 7, 20),  # outside that week
                start_minute=540,
                end_minute=600,
                timesheet_code_id=code_id,
                activity="Bug fixing",
            ),
        ]
    )
    session.commit()

    grid = aggregate_period(session, user_id, "weekly", date(2026, 7, 1))

    assert (grid.start, grid.end) == (date(2026, 6, 29), date(2026, 7, 5))
    assert len(grid.rows) == 1
    assert grid.rows[0].minutes_by_day == {1: 60}


def test_aggregate_weekly_crossing_month_boundary_keeps_days_distinct(session: Session) -> None:
    """A week spanning July 27 - August 2 has day-of-month values 27-31 and 1-2: no overlap possible
    (see `PeriodRow.minutes_by_day`'s docstring), so both sides of the boundary must stay distinct
    entries in the same grid row."""
    user_id, code_id = _seed(session)
    session.add_all(
        [
            Entry(
                user_id=user_id,
                date=date(2026, 7, 31),
                start_minute=540,
                end_minute=600,
                timesheet_code_id=code_id,
                activity="Bug fixing",
            ),
            Entry(
                user_id=user_id,
                date=date(2026, 8, 1),
                start_minute=540,
                end_minute=660,
                timesheet_code_id=code_id,
                activity="Bug fixing",
            ),
        ]
    )
    session.commit()

    grid = aggregate_period(session, user_id, "weekly", date(2026, 7, 31))

    assert (grid.start, grid.end) == (date(2026, 7, 27), date(2026, 8, 2))
    assert len(grid.rows) == 1
    assert grid.rows[0].minutes_by_day == {31: 60, 1: 120}


def test_aggregate_respects_monthly_scheme(session: Session) -> None:
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
                date=date(2026, 7, 20),
                start_minute=540,
                end_minute=600,
                timesheet_code_id=code_id,
                activity="Bug fixing",
            ),
            Entry(
                user_id=user_id,
                date=date(2026, 8, 1),  # outside July
                start_minute=540,
                end_minute=600,
                timesheet_code_id=code_id,
                activity="Bug fixing",
            ),
        ]
    )
    session.commit()

    grid = aggregate_period(session, user_id, "monthly", date(2026, 7, 15))

    assert (grid.start, grid.end) == (date(2026, 7, 1), date(2026, 7, 31))
    assert len(grid.rows) == 1
    assert grid.rows[0].minutes_by_day == {1: 60, 20: 60}
