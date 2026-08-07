"""Per-code time totals over an arbitrary date range (BIZ-089).

Distinct from ``services/period.py``: every aggregation there is bound to a Timesheet period and
shaped for the Timesheet-system matrix. This answers "how much time did you spend on X?" over any
span, or over all time.
"""

from __future__ import annotations

from datetime import date

import pytest
from sqlalchemy.orm import Session

from walker.exceptions import NotFoundError, ValidationError
from walker.models import Entry, Organization, TimesheetCode, User
from walker.services import code_totals


@pytest.fixture(autouse=True)
def _seed(session: Session) -> None:
    """A real code (10) with one virtual child (20), plus an unrelated real code (11)."""
    session.add(Organization(id=1, email_domain="example.com"))
    session.commit()
    session.add(User(id=1, username="user-1", organization_id=1))
    session.add(User(id=2, username="user-2", organization_id=1))
    session.commit()
    session.add(
        TimesheetCode(
            id=10, user_id=1, organization_id=1, number="N9/1042", label="MNT - PAP", name="Paper", color="#111111"
        )
    )
    session.add(
        TimesheetCode(
            id=11, user_id=1, organization_id=1, number="N9/2000", label="MNT - OTHER", name="Other", color="#222222"
        )
    )
    session.commit()
    session.add(
        TimesheetCode(
            id=20,
            user_id=1,
            number="N9/1042",
            label="MNT - PAP",
            name="Paper — infra",
            color="#333333",
            real_code_id=10,
        )
    )
    session.commit()


def _entry(
    session: Session,
    *,
    code_id: int,
    day: date,
    minutes: int,
    activity: str = "Build",
    user_id: int = 1,
    running: bool = False,
) -> Entry:
    entry = Entry(
        user_id=user_id,
        date=day,
        start_minute=540,
        end_minute=None if running else 540 + minutes,
        timesheet_code_id=code_id,
        activity=activity,
    )
    session.add(entry)
    session.commit()
    return entry


# --- Totals ---------------------------------------------------------------------------------------


def test_all_time_totals_need_no_dates(session: Session) -> None:
    _entry(session, code_id=10, day=date(2025, 1, 5), minutes=60)
    _entry(session, code_id=10, day=date(2026, 7, 3), minutes=30)

    totals = code_totals.code_totals(session, 1, 10)

    assert totals.minutes == 90
    assert totals.entries == 2
    assert totals.days == 2


def test_range_is_inclusive_on_both_ends(session: Session) -> None:
    _entry(session, code_id=10, day=date(2026, 7, 1), minutes=10)
    _entry(session, code_id=10, day=date(2026, 7, 15), minutes=20)
    _entry(session, code_id=10, day=date(2026, 7, 31), minutes=40)

    totals = code_totals.code_totals(session, 1, 10, start=date(2026, 7, 1), end=date(2026, 7, 31))

    assert totals.minutes == 70


def test_range_excludes_what_falls_outside(session: Session) -> None:
    _entry(session, code_id=10, day=date(2026, 6, 30), minutes=10)
    _entry(session, code_id=10, day=date(2026, 7, 15), minutes=20)
    _entry(session, code_id=10, day=date(2026, 8, 1), minutes=40)

    totals = code_totals.code_totals(session, 1, 10, start=date(2026, 7, 1), end=date(2026, 7, 31))

    assert totals.minutes == 20
    assert totals.entries == 1


def test_a_range_may_span_several_periods(session: Session) -> None:
    """The point of the ticket: nothing here is bound to a Timesheet period."""
    for month in (5, 6, 7):
        _entry(session, code_id=10, day=date(2026, month, 10), minutes=60)

    totals = code_totals.code_totals(session, 1, 10, start=date(2026, 5, 1), end=date(2026, 7, 31))

    assert totals.minutes == 180


def test_distinct_days_counts_days_not_entries(session: Session) -> None:
    _entry(session, code_id=10, day=date(2026, 7, 3), minutes=30)
    _entry(session, code_id=10, day=date(2026, 7, 3), minutes=30, activity="Support")
    _entry(session, code_id=10, day=date(2026, 7, 4), minutes=30)

    totals = code_totals.code_totals(session, 1, 10)

    assert totals.entries == 3
    assert totals.days == 2


def test_totals_are_exact_to_the_minute(session: Session) -> None:
    """ADR-0005: no rounding anywhere on this path."""
    _entry(session, code_id=10, day=date(2026, 7, 3), minutes=7)
    _entry(session, code_id=10, day=date(2026, 7, 4), minutes=53)

    assert code_totals.code_totals(session, 1, 10).minutes == 60


def test_only_the_users_own_time_is_counted(session: Session) -> None:
    _entry(session, code_id=10, day=date(2026, 7, 3), minutes=60)
    _entry(session, code_id=10, day=date(2026, 7, 4), minutes=60, user_id=2)

    assert code_totals.code_totals(session, 1, 10).minutes == 60


def test_empty_result_is_zero_not_an_error(session: Session) -> None:
    totals = code_totals.code_totals(session, 1, 10)

    assert (totals.minutes, totals.entries, totals.days) == (0, 0, 0)
    assert totals.by_activity == []


def test_unknown_code_is_rejected(session: Session) -> None:
    with pytest.raises(NotFoundError):
        code_totals.code_totals(session, 1, 999)


def test_end_before_start_is_rejected(session: Session) -> None:
    with pytest.raises(ValidationError):
        code_totals.code_totals(session, 1, 10, start=date(2026, 7, 31), end=date(2026, 7, 1))


# --- Running entries ------------------------------------------------------------------------------


def test_a_running_entry_contributes_no_minutes_but_is_signalled(session: Session) -> None:
    _entry(session, code_id=10, day=date(2026, 7, 3), minutes=60)
    _entry(session, code_id=10, day=date(2026, 7, 4), minutes=0, running=True)

    totals = code_totals.code_totals(session, 1, 10)

    assert totals.minutes == 60
    assert totals.entries == 1  # the running one is not a counted entry either
    assert totals.running is True


def test_running_is_false_when_the_timer_is_on_another_code(session: Session) -> None:
    _entry(session, code_id=11, day=date(2026, 7, 4), minutes=0, running=True)

    assert code_totals.code_totals(session, 1, 10).running is False


# --- Per-activity breakdown -----------------------------------------------------------------------


def test_breakdown_splits_by_activity_largest_first(session: Session) -> None:
    _entry(session, code_id=10, day=date(2026, 7, 3), minutes=30, activity="Support")
    _entry(session, code_id=10, day=date(2026, 7, 4), minutes=120, activity="Build")
    _entry(session, code_id=10, day=date(2026, 7, 5), minutes=60, activity="Build")

    rows = code_totals.code_totals(session, 1, 10).by_activity

    assert [(r.activity, r.minutes, r.entries) for r in rows] == [("Build", 180, 2), ("Support", 30, 1)]


def test_breakdown_keeps_entries_with_no_activity_visible(session: Session) -> None:
    """A code-only entry is real captured time; hiding it would make the parts not sum to the whole."""
    _entry(session, code_id=10, day=date(2026, 7, 3), minutes=30, activity=None)  # type: ignore[arg-type]

    rows = code_totals.code_totals(session, 1, 10).by_activity

    assert [(r.activity, r.minutes) for r in rows] == [(None, 30)]


# --- Virtual codes and roll-up --------------------------------------------------------------------


def test_a_virtual_code_reports_its_own_time_not_its_backing_codes(session: Session) -> None:
    """ADR-0008: collapsing virtual into real serves the Timesheet view; this is the opposite case."""
    _entry(session, code_id=10, day=date(2026, 7, 3), minutes=60)
    _entry(session, code_id=20, day=date(2026, 7, 4), minutes=30)

    assert code_totals.code_totals(session, 1, 20).minutes == 30


def test_a_real_code_reports_its_own_time_without_its_virtual_children(session: Session) -> None:
    _entry(session, code_id=10, day=date(2026, 7, 3), minutes=60)
    _entry(session, code_id=20, day=date(2026, 7, 4), minutes=30)

    assert code_totals.code_totals(session, 1, 10).minutes == 60


def test_a_real_code_rolls_its_virtual_children_up(session: Session) -> None:
    _entry(session, code_id=10, day=date(2026, 7, 3), minutes=60)
    _entry(session, code_id=20, day=date(2026, 7, 4), minutes=30)

    rollup = code_totals.code_totals(session, 1, 10).rollup

    assert rollup is not None
    assert rollup.minutes == 90
    assert rollup.entries == 2
    assert rollup.days == 2


def test_no_rollup_when_a_real_code_has_no_virtual_children(session: Session) -> None:
    _entry(session, code_id=11, day=date(2026, 7, 3), minutes=60)

    assert code_totals.code_totals(session, 1, 11).rollup is None


def test_a_virtual_code_never_rolls_up(session: Session) -> None:
    _entry(session, code_id=20, day=date(2026, 7, 4), minutes=30)

    assert code_totals.code_totals(session, 1, 20).rollup is None


def test_the_rollup_respects_the_range(session: Session) -> None:
    _entry(session, code_id=10, day=date(2026, 7, 3), minutes=60)
    _entry(session, code_id=20, day=date(2026, 8, 4), minutes=30)  # outside

    rollup = code_totals.code_totals(session, 1, 10, start=date(2026, 7, 1), end=date(2026, 7, 31)).rollup

    assert rollup is not None
    assert rollup.minutes == 60
