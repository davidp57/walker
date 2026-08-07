"""Retiring a code (BIZ-090).

A closed charge line cannot simply be deleted — its Entries are real captured time, which is why
``delete_code`` refuses (BIZ-088). Marking it obsolete stops it being offered without touching what
it already carries.
"""

from __future__ import annotations

from datetime import date, datetime

import pytest
from sqlalchemy.orm import Session

from walker.exceptions import NotFoundError, ValidationError
from walker.models import Activity, Entry, Organization, TimesheetCode, User
from walker.services import catalog, likely_codes


@pytest.fixture(autouse=True)
def _seed(session: Session) -> None:
    session.add(Organization(id=1, email_domain="example.com"))
    session.commit()
    session.add(User(id=1, username="user-1", organization_id=1))
    session.add(User(id=2, username="user-2", organization_id=1))
    session.commit()
    for code_id, number, name in ((10, "N9/1042", "Paper"), (11, "N9/2000", "Successor")):
        session.add(
            TimesheetCode(
                id=code_id,
                user_id=1,
                organization_id=1,
                number=number,
                label=f"MNT - {name}",
                name=name,
                color="#111111",
                activities=[Activity(code="0001", label="Build"), Activity(code="0002", label="Support")],
            )
        )
    session.commit()


def _entry(session: Session, *, code_id: int, day: date, user_id: int = 1, activity: str = "Build") -> Entry:
    entry = Entry(
        user_id=user_id,
        date=day,
        start_minute=540,
        end_minute=600,
        timesheet_code_id=code_id,
        activity=activity,
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


# --- The flag -------------------------------------------------------------------------------------


def test_a_code_starts_live(session: Session) -> None:
    assert catalog.get_visible_code(session, 1, 10).obsolete is False


def test_marking_and_unmarking_round_trips(session: Session) -> None:
    assert catalog.set_obsolete(session, 1, 10, obsolete=True).obsolete is True
    assert catalog.get_visible_code(session, 1, 10).obsolete is True

    assert catalog.set_obsolete(session, 1, 10, obsolete=False).obsolete is False


def test_marking_an_unknown_code_is_rejected(session: Session) -> None:
    with pytest.raises(NotFoundError):
        catalog.set_obsolete(session, 1, 999, obsolete=True)


def test_an_obsolete_code_is_still_listed_by_the_service(session: Session) -> None:
    """Hiding is the SPA's job: the API must keep returning it so past entries resolve (as ADR-0014)."""
    catalog.set_obsolete(session, 1, 10, obsolete=True)

    assert 10 in {code.id for code in catalog.list_codes(session, 1)}


def test_an_obsolete_code_can_still_be_deleted_when_nothing_blocks(session: Session) -> None:
    """Obsolete is not a substitute for deletion — the normal path still applies."""
    catalog.set_obsolete(session, 1, 10, obsolete=True)

    catalog.delete_code(session, 1, 10)

    assert session.get(TimesheetCode, 10) is None


def test_an_obsolete_code_with_entries_still_refuses_deletion(session: Session) -> None:
    catalog.set_obsolete(session, 1, 10, obsolete=True)
    _entry(session, code_id=10, day=date(2026, 7, 3))

    with pytest.raises(ValidationError):
        catalog.delete_code(session, 1, 10)


# --- Pickers --------------------------------------------------------------------------------------


def test_the_likely_codes_band_stops_proposing_an_obsolete_code(session: Session) -> None:
    """A habit score over past entries would otherwise resurrect a retired code forever."""
    # Eight same-weekday mornings — comfortably past MIN_SCORE for a 09:30 context.
    for day in (6, 13, 20, 27, 3, 10, 17, 24):
        _entry(session, code_id=10, day=date(2026, 7, day) if day > 5 else date(2026, 8, day))
    at = datetime(2026, 8, 24, 9, 30)

    before = likely_codes.likely_codes(session, 1, at=at, limit=5)
    assert any(row.code_id == 10 for row in before)

    catalog.set_obsolete(session, 1, 10, obsolete=True)

    after = likely_codes.likely_codes(session, 1, at=at, limit=5)
    assert all(row.code_id != 10 for row in after)


# --- The optional sweep ---------------------------------------------------------------------------


def test_the_sweep_moves_only_entries_inside_the_window(session: Session) -> None:
    before_window = _entry(session, code_id=10, day=date(2026, 6, 30))
    inside = _entry(session, code_id=10, day=date(2026, 7, 10))
    after_window = _entry(session, code_id=10, day=date(2026, 8, 1))

    moved = catalog.reassign_entries_in_range(
        session, 1, 10, target_code_id=11, activity="Support", start=date(2026, 7, 1), end=date(2026, 7, 31)
    )

    for entry in (before_window, inside, after_window):
        session.refresh(entry)
    assert moved == 1
    assert inside.timesheet_code_id == 11
    assert inside.activity == "Support"
    assert before_window.timesheet_code_id == 10
    assert after_window.timesheet_code_id == 10


def test_the_sweep_leaves_another_members_entries_alone(session: Session) -> None:
    mine = _entry(session, code_id=10, day=date(2026, 7, 10))
    theirs = _entry(session, code_id=10, day=date(2026, 7, 11), user_id=2)

    moved = catalog.reassign_entries_in_range(
        session, 1, 10, target_code_id=11, activity="Support", start=date(2026, 7, 1), end=date(2026, 7, 31)
    )

    session.refresh(mine)
    session.refresh(theirs)
    assert moved == 1
    assert mine.timesheet_code_id == 11
    assert theirs.timesheet_code_id == 10


def test_the_sweep_requires_an_activity(session: Session) -> None:
    _entry(session, code_id=10, day=date(2026, 7, 10))

    with pytest.raises(ValidationError):
        catalog.reassign_entries_in_range(
            session, 1, 10, target_code_id=11, activity="  ", start=date(2026, 7, 1), end=date(2026, 7, 31)
        )


def test_the_sweep_rejects_the_same_code_as_target(session: Session) -> None:
    with pytest.raises(ValidationError):
        catalog.reassign_entries_in_range(
            session, 1, 10, target_code_id=10, activity="Support", start=date(2026, 7, 1), end=date(2026, 7, 31)
        )


def test_the_sweep_rejects_an_obsolete_target(session: Session) -> None:
    """Moving entries onto a code that is itself retired would just repeat the problem."""
    catalog.set_obsolete(session, 1, 11, obsolete=True)

    with pytest.raises(ValidationError, match="obsolete"):
        catalog.reassign_entries_in_range(
            session, 1, 10, target_code_id=11, activity="Support", start=date(2026, 7, 1), end=date(2026, 7, 31)
        )


def test_an_unbounded_reassign_still_works_for_biz_088(session: Session) -> None:
    """The BIZ-088 delete-unblock path is the same function with no window."""
    _entry(session, code_id=10, day=date(2020, 1, 1))
    _entry(session, code_id=10, day=date(2026, 7, 10))

    moved = catalog.reassign_blocking_entries(session, 1, 10, target_code_id=11, activity="Support")

    assert moved == 2
    assert catalog.blocking_entries(session, 1, 10).total == 0
