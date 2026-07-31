"""Pure service tests for the recurrence date math (BIZ-025).

Deterministic: work rhythm and absences are seeded plain inputs, no database involved (see lot
TASKS PRD, "Recurrence math is a pure, dependency-injected function").
"""

from __future__ import annotations

from datetime import date

import pytest

from walker.services.recurrence import (
    EveryNDaysRule,
    MonthlyRule,
    PeriodRelativeRule,
    WeeklyRule,
    first_due_date,
    next_due_date,
)

# Mon-Fri worked, Sat/Sun off (Sun-first, matching Settings.workdays / DEFAULT_WORKDAYS).
MON_FRI = [False, True, True, True, True, True, False]
# Every day worked — isolates the "snap to working day" logic from the "skip weekends" default.
ALL_DAYS = [True] * 7


def test_every_n_days_advances_by_n() -> None:
    rule = EveryNDaysRule(n=3)

    result = next_due_date(
        rule, period_scheme="semi_monthly", current_due=date(2026, 7, 1), workdays=MON_FRI, absences=set()
    )

    assert result == date(2026, 7, 4)


def test_every_n_days_with_n_one() -> None:
    rule = EveryNDaysRule(n=1)

    result = next_due_date(
        rule, period_scheme="semi_monthly", current_due=date(2026, 7, 1), workdays=MON_FRI, absences=set()
    )

    assert result == date(2026, 7, 2)


def test_weekly_picks_next_chosen_weekday_same_week() -> None:
    # Wednesday 2026-07-01 is a Wednesday (weekday()==2); rule fires Mon/Wed/Fri (0,2,4).
    rule = WeeklyRule(weekdays=[0, 2, 4])

    result = next_due_date(
        rule, period_scheme="semi_monthly", current_due=date(2026, 7, 1), workdays=MON_FRI, absences=set()
    )

    assert result == date(2026, 7, 3)  # next Friday


def test_weekly_wraps_to_next_week_when_no_more_days_this_week() -> None:
    # Friday 2026-07-03 is the last chosen day of that week; next occurrence wraps to Monday.
    rule = WeeklyRule(weekdays=[0, 2, 4])

    result = next_due_date(
        rule, period_scheme="semi_monthly", current_due=date(2026, 7, 3), workdays=MON_FRI, absences=set()
    )

    assert result == date(2026, 7, 6)  # next Monday


def test_weekly_single_weekday_advances_a_full_week() -> None:
    rule = WeeklyRule(weekdays=[0])  # every Monday

    result = next_due_date(
        rule, period_scheme="semi_monthly", current_due=date(2026, 7, 6), workdays=MON_FRI, absences=set()
    )

    assert result == date(2026, 7, 13)


def test_monthly_advances_to_same_day_next_month() -> None:
    rule = MonthlyRule(day=15)

    result = next_due_date(
        rule, period_scheme="semi_monthly", current_due=date(2026, 7, 15), workdays=MON_FRI, absences=set()
    )

    assert result == date(2026, 8, 15)


def test_monthly_clamps_to_shorter_month() -> None:
    rule = MonthlyRule(day=31)

    result = next_due_date(
        rule, period_scheme="semi_monthly", current_due=date(2026, 1, 31), workdays=MON_FRI, absences=set()
    )

    assert result == date(2026, 2, 28)  # 2026 is not a leap year


def test_monthly_handles_december_to_january_rollover() -> None:
    rule = MonthlyRule(day=5)

    result = next_due_date(
        rule, period_scheme="semi_monthly", current_due=date(2026, 12, 5), workdays=MON_FRI, absences=set()
    )

    assert result == date(2027, 1, 5)


def test_period_relative_start_anchor_no_offset() -> None:
    # Current due 2026-07-01 (first period); next period starts 2026-07-16.
    rule = PeriodRelativeRule(anchor="start", offset_days=0)

    result = next_due_date(
        rule, period_scheme="semi_monthly", current_due=date(2026, 7, 1), workdays=ALL_DAYS, absences=set()
    )

    assert result == date(2026, 7, 16)


def test_period_relative_end_anchor_no_offset() -> None:
    # Current due in the period ending 2026-07-15; next period ends 2026-07-31.
    rule = PeriodRelativeRule(anchor="end", offset_days=0)

    result = next_due_date(
        rule, period_scheme="semi_monthly", current_due=date(2026, 7, 15), workdays=ALL_DAYS, absences=set()
    )

    assert result == date(2026, 7, 31)


def test_period_relative_end_anchor_last_working_day_before_end() -> None:
    # 2026-07-31 is a Friday -> last working day before/at period end with offset -1 lands
    # on the last workday strictly before the boundary given Mon-Fri rhythm.
    rule = PeriodRelativeRule(anchor="end", offset_days=-1)

    result = next_due_date(
        rule, period_scheme="semi_monthly", current_due=date(2026, 6, 15), workdays=MON_FRI, absences=set()
    )

    # Period ending 2026-06-30 (Tuesday, a workday) -> 1 working day before = 2026-06-29 (Monday).
    assert result == date(2026, 6, 29)


def test_period_relative_end_anchor_skips_weekend_to_find_last_working_day() -> None:
    # Period ending 2026-08-15 is a Saturday; offset 0 snaps back to the last working day.
    rule = PeriodRelativeRule(anchor="end", offset_days=0)

    result = next_due_date(
        rule, period_scheme="semi_monthly", current_due=date(2026, 7, 20), workdays=MON_FRI, absences=set()
    )

    assert result == date(2026, 8, 14)  # Friday 2026-08-14


def test_period_relative_end_anchor_skips_absence() -> None:
    # Period ending 2026-06-30 (Tuesday, workday) with offset -1: 1 working day back would be
    # Monday 2026-06-29, but it's an absence, so skip further back to Friday 2026-06-26.
    rule = PeriodRelativeRule(anchor="end", offset_days=-1)

    result = next_due_date(
        rule,
        period_scheme="semi_monthly",
        current_due=date(2026, 6, 15),
        workdays=MON_FRI,
        absences={date(2026, 6, 29)},
    )

    assert result == date(2026, 6, 26)


def test_period_relative_start_anchor_positive_offset() -> None:
    # Next period starts 2026-07-16 (Thursday); offset +1 working day -> 2026-07-17 (Friday).
    rule = PeriodRelativeRule(anchor="start", offset_days=1)

    result = next_due_date(
        rule, period_scheme="semi_monthly", current_due=date(2026, 7, 1), workdays=MON_FRI, absences=set()
    )

    assert result == date(2026, 7, 17)


def test_period_relative_from_second_half_rolls_to_next_month_start() -> None:
    rule = PeriodRelativeRule(anchor="start", offset_days=0)

    result = next_due_date(
        rule, period_scheme="semi_monthly", current_due=date(2026, 7, 20), workdays=ALL_DAYS, absences=set()
    )

    assert result == date(2026, 8, 1)


# --- BIZ-086: the period scheme is the user's, not a hardcoded semi_monthly -----------------------


def test_period_relative_honours_the_users_period_scheme() -> None:
    """The same rule, the same day, three schemes — three different dates (ADR-0009)."""
    rule = PeriodRelativeRule(anchor="end", offset_days=0)
    args = {"current_due": date(2026, 7, 20), "workdays": ALL_DAYS, "absences": set()}

    # Each rolls forward to the end of the period *after* the one holding 2026-07-20 (a Monday).
    assert next_due_date(rule, period_scheme="weekly", **args) == date(2026, 8, 2)
    assert next_due_date(rule, period_scheme="semi_monthly", **args) == date(2026, 8, 15)
    assert next_due_date(rule, period_scheme="monthly", **args) == date(2026, 8, 31)


# --- BIZ-086: first_due_date — seeding, as opposed to rolling forward -----------------------------


def test_first_due_date_lands_in_the_current_period_when_still_ahead() -> None:
    """The reported bug: "period end - 1 working day" set mid-period must fire *this* period."""
    rule = PeriodRelativeRule(anchor="end", offset_days=-1)

    result = first_due_date(rule, period_scheme="semi_monthly", on=date(2026, 7, 20), workdays=MON_FRI, absences=set())

    assert result == date(2026, 7, 30)  # Thursday, one working day before the 31st


def test_first_due_date_moves_on_when_this_periods_date_has_passed() -> None:
    rule = PeriodRelativeRule(anchor="end", offset_days=-1)

    # On the 31st, this period's occurrence (the 30th) is behind us — take the next period's.
    result = first_due_date(rule, period_scheme="semi_monthly", on=date(2026, 7, 31), workdays=MON_FRI, absences=set())

    assert result == date(2026, 8, 14)


def test_first_due_date_accepts_today_itself() -> None:
    rule = PeriodRelativeRule(anchor="end", offset_days=-1)

    # The 30th *is* the occurrence: "at or after" must not skip it.
    result = first_due_date(rule, period_scheme="semi_monthly", on=date(2026, 7, 30), workdays=MON_FRI, absences=set())

    assert result == date(2026, 7, 30)


def test_first_due_date_follows_the_period_scheme() -> None:
    rule = PeriodRelativeRule(anchor="end", offset_days=-1)
    args = {"on": date(2026, 7, 10), "workdays": MON_FRI, "absences": set()}

    assert first_due_date(rule, period_scheme="weekly", **args) == date(2026, 7, 10)
    assert first_due_date(rule, period_scheme="semi_monthly", **args) == date(2026, 7, 14)
    assert first_due_date(rule, period_scheme="monthly", **args) == date(2026, 7, 30)


def test_first_due_date_weekly_takes_today_when_it_matches() -> None:
    rule = WeeklyRule(weekdays=[4])  # Friday

    on_friday = first_due_date(
        rule, period_scheme="semi_monthly", on=date(2026, 7, 10), workdays=MON_FRI, absences=set()
    )
    on_saturday = first_due_date(
        rule, period_scheme="semi_monthly", on=date(2026, 7, 11), workdays=MON_FRI, absences=set()
    )

    assert on_friday == date(2026, 7, 10)  # today, not next week
    assert on_saturday == date(2026, 7, 17)


def test_first_due_date_monthly_takes_this_month_then_next() -> None:
    rule = MonthlyRule(day=15)
    common = {"period_scheme": "semi_monthly", "workdays": MON_FRI, "absences": set()}

    assert first_due_date(rule, on=date(2026, 7, 1), **common) == date(2026, 7, 15)
    assert first_due_date(rule, on=date(2026, 7, 15), **common) == date(2026, 7, 15)
    assert first_due_date(rule, on=date(2026, 7, 16), **common) == date(2026, 8, 15)


def test_first_due_date_monthly_clamps_to_a_shorter_month() -> None:
    rule = MonthlyRule(day=31)
    common = {"period_scheme": "semi_monthly", "workdays": MON_FRI, "absences": set()}

    assert first_due_date(rule, on=date(2026, 2, 1), **common) == date(2026, 2, 28)


def test_first_due_date_every_n_days_starts_today() -> None:
    """ "Every N days" has no absolute phase, so the cycle starts the day it is set."""
    rule = EveryNDaysRule(n=3)

    result = first_due_date(rule, period_scheme="semi_monthly", on=date(2026, 7, 20), workdays=MON_FRI, absences=set())

    assert result == date(2026, 7, 20)


def test_every_n_days_rejects_non_positive_n() -> None:
    with pytest.raises(ValueError, match="n must be positive"):
        EveryNDaysRule(n=0)


def test_weekly_rejects_empty_weekdays() -> None:
    with pytest.raises(ValueError, match="weekdays must not be empty"):
        WeeklyRule(weekdays=[])


def test_weekly_rejects_out_of_range_weekday() -> None:
    with pytest.raises(ValueError, match=r"weekdays must be within 0\.\.6"):
        WeeklyRule(weekdays=[7])


def test_monthly_rejects_out_of_range_day() -> None:
    with pytest.raises(ValueError, match=r"day must be within 1\.\.31"):
        MonthlyRule(day=32)


def test_period_relative_rejects_bad_anchor() -> None:
    with pytest.raises(ValueError, match="anchor must be 'start' or 'end'"):
        PeriodRelativeRule(anchor="middle", offset_days=0)  # type: ignore[arg-type]
