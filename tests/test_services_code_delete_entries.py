"""Resolving the Entries that block a code deletion (BIZ-088).

``delete_code``'s in-use guard is Organization-wide (BIZ-030) but every read/write path is
user-scoped, so these tests pin down both halves: what the *report* counts (everyone's entries, so
the block is explainable) and what the *mutations* touch (only the acting user's).
"""

from __future__ import annotations

from datetime import date

import pytest
from sqlalchemy.orm import Session

from walker.exceptions import NotFoundError, ValidationError
from walker.models import Entry, Organization, TimesheetCode, User
from walker.services import catalog


@pytest.fixture(autouse=True)
def _seed(session: Session) -> None:
    """Two users in one Organization, plus a real code and a target code to reassign onto."""
    session.add(Organization(id=1, email_domain="example.com"))
    session.commit()
    session.add(User(id=1, username="user-1", organization_id=1))
    session.add(User(id=2, username="user-2", organization_id=1))
    session.commit()
    session.add(
        TimesheetCode(
            id=10,
            user_id=1,
            organization_id=1,
            number="N9/1042",
            label="MNT - PAP",
            name="Paper",
            color="#111111",
        )
    )
    session.add(
        TimesheetCode(
            id=11,
            user_id=1,
            organization_id=1,
            number="N9/2000",
            label="MNT - OTHER",
            name="Other",
            color="#222222",
        )
    )
    session.commit()


def _entry(session: Session, *, user_id: int, day: int, start: int, end: int | None, code_id: int | None = 10) -> Entry:
    entry = Entry(
        user_id=user_id,
        date=date(2026, 7, day),
        start_minute=start,
        end_minute=end,
        timesheet_code_id=code_id,
        activity="Bug fixing",
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


# --- The report -----------------------------------------------------------------------------------


def test_summary_is_empty_when_nothing_references_the_code(session: Session) -> None:
    summary = catalog.blocking_entries(session, 1, 10)

    assert summary.total == 0
    assert summary.own == 0
    assert summary.others == 0
    assert summary.first_date is None
    assert summary.last_date is None
    assert summary.minutes == 0


def test_summary_reports_count_range_and_minutes(session: Session) -> None:
    _entry(session, user_id=1, day=3, start=540, end=600)  # 60 min
    _entry(session, user_id=1, day=10, start=540, end=630)  # 90 min

    summary = catalog.blocking_entries(session, 1, 10)

    assert summary.total == 2
    assert summary.first_date == date(2026, 7, 3)
    assert summary.last_date == date(2026, 7, 10)
    assert summary.minutes == 150


def test_summary_counts_the_whole_organization_but_splits_out_the_users_own(session: Session) -> None:
    """The guard blocks on anyone's entries, so the report has to explain the ones you cannot touch."""
    _entry(session, user_id=1, day=3, start=540, end=600)
    _entry(session, user_id=2, day=4, start=540, end=600)
    _entry(session, user_id=2, day=5, start=540, end=600)

    summary = catalog.blocking_entries(session, 1, 10)

    assert summary.total == 3
    assert summary.own == 1
    assert summary.others == 2


def test_summary_counts_a_running_entry_too(session: Session) -> None:
    """A running entry still holds the foreign key, so it blocks — it just contributes no minutes."""
    _entry(session, user_id=1, day=3, start=540, end=None)

    summary = catalog.blocking_entries(session, 1, 10)

    assert summary.total == 1
    assert summary.minutes == 0


def test_summary_rejects_a_code_the_user_cannot_see(session: Session) -> None:
    with pytest.raises(NotFoundError):
        catalog.blocking_entries(session, 1, 999)


# --- Listing --------------------------------------------------------------------------------------


def test_listing_returns_only_the_users_own_entries_newest_first(session: Session) -> None:
    _entry(session, user_id=1, day=3, start=540, end=600)
    _entry(session, user_id=1, day=10, start=540, end=600)
    _entry(session, user_id=2, day=4, start=540, end=600)

    entries = catalog.list_blocking_entries(session, 1, 10)

    assert [e.date for e in entries] == [date(2026, 7, 10), date(2026, 7, 3)]


# --- Reassign -------------------------------------------------------------------------------------


def test_reassign_moves_the_users_entries_and_unblocks_the_delete(session: Session) -> None:
    _entry(session, user_id=1, day=3, start=540, end=600)
    _entry(session, user_id=1, day=10, start=540, end=600)

    moved = catalog.reassign_blocking_entries(session, 1, 10, target_code_id=11, activity="Support")

    assert moved == 2
    assert catalog.blocking_entries(session, 1, 10).total == 0
    catalog.delete_code(session, 1, 10)  # no longer blocked


def test_reassign_sets_the_activity_so_nothing_lands_uncategorized(session: Session) -> None:
    entry = _entry(session, user_id=1, day=3, start=540, end=600)

    catalog.reassign_blocking_entries(session, 1, 10, target_code_id=11, activity="Support")

    session.refresh(entry)
    assert entry.timesheet_code_id == 11
    assert entry.activity == "Support"


def test_reassign_leaves_another_members_entries_alone(session: Session) -> None:
    mine = _entry(session, user_id=1, day=3, start=540, end=600)
    theirs = _entry(session, user_id=2, day=4, start=540, end=600)

    moved = catalog.reassign_blocking_entries(session, 1, 10, target_code_id=11, activity="Support")

    session.refresh(mine)
    session.refresh(theirs)
    assert moved == 1
    assert mine.timesheet_code_id == 11
    assert theirs.timesheet_code_id == 10  # untouched — not the acting user's to move


def test_reassign_rejects_an_empty_activity(session: Session) -> None:
    _entry(session, user_id=1, day=3, start=540, end=600)

    with pytest.raises(ValidationError):
        catalog.reassign_blocking_entries(session, 1, 10, target_code_id=11, activity="   ")


def test_reassign_rejects_the_same_code_as_target(session: Session) -> None:
    _entry(session, user_id=1, day=3, start=540, end=600)

    with pytest.raises(ValidationError):
        catalog.reassign_blocking_entries(session, 1, 10, target_code_id=10, activity="Support")


def test_reassign_rejects_a_target_the_user_cannot_see(session: Session) -> None:
    _entry(session, user_id=1, day=3, start=540, end=600)

    with pytest.raises(NotFoundError):
        catalog.reassign_blocking_entries(session, 1, 10, target_code_id=999, activity="Support")


# --- Delete ---------------------------------------------------------------------------------------


def test_deleting_the_blocking_entries_unblocks_the_code(session: Session) -> None:
    _entry(session, user_id=1, day=3, start=540, end=600)

    removed = catalog.delete_blocking_entries(session, 1, 10)

    assert removed == 1
    catalog.delete_code(session, 1, 10)


def test_deleting_leaves_another_members_entries_alone(session: Session) -> None:
    _entry(session, user_id=1, day=3, start=540, end=600)
    theirs = _entry(session, user_id=2, day=4, start=540, end=600)

    removed = catalog.delete_blocking_entries(session, 1, 10)

    assert removed == 1
    assert session.get(Entry, theirs.id) is not None
    # Still blocked, and the message must say so rather than looking like a bug.
    with pytest.raises(ValidationError, match="another member"):
        catalog.delete_code(session, 1, 10)


# --- The delete guard's message -------------------------------------------------------------------


def test_delete_error_carries_the_count_and_range(session: Session) -> None:
    _entry(session, user_id=1, day=3, start=540, end=600)
    _entry(session, user_id=1, day=10, start=540, end=600)

    with pytest.raises(ValidationError, match=r"2 entries"):
        catalog.delete_code(session, 1, 10)
