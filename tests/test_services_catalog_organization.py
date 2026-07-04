"""Organization-scoped real-code catalog tests (BIZ-030, ADR-0010).

Real codes (``real_code_id is None``) are scoped by ``organization_id``: every member of an
Organization shares the same catalog. Virtual codes stay scoped by ``user_id`` — personal, never
shared, exactly as before (ADR-0008).
"""

from __future__ import annotations

from datetime import date

import pytest
from sqlalchemy.orm import Session

from walker.exceptions import ValidationError
from walker.models import Entry, Organization, ReferenceCode, User
from walker.services import catalog, reference


def _make_org(session: Session, domain: str) -> Organization:
    org = Organization(email_domain=domain)
    session.add(org)
    session.commit()
    session.refresh(org)
    return org


def _make_user(session: Session, username: str, organization: Organization) -> User:
    user = User(username=username, organization_id=organization.id)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def test_two_users_in_same_organization_share_the_real_code_catalog(session: Session) -> None:
    org = _make_org(session, "acme.example")
    alice = _make_user(session, "alice", org)
    bob = _make_user(session, "bob", org)

    code = catalog.create_code(session, alice.id, number="N9/1042", label="MNT", name=None, color=None, activities=[])

    bob_codes = catalog.list_codes(session, bob.id)
    assert [c.id for c in bob_codes] == [code.id]


def test_user_in_different_organization_does_not_see_the_catalog(session: Session) -> None:
    org_a = _make_org(session, "acme.example")
    org_b = _make_org(session, "other.example")
    alice = _make_user(session, "alice", org_a)
    carl = _make_user(session, "carl", org_b)

    catalog.create_code(session, alice.id, number="N9/1042", label="MNT", name=None, color=None, activities=[])

    carl_codes = catalog.list_codes(session, carl.id)
    assert carl_codes == []


def test_second_org_member_can_edit_a_real_code_created_by_another_member(session: Session) -> None:
    org = _make_org(session, "acme.example")
    alice = _make_user(session, "alice", org)
    bob = _make_user(session, "bob", org)
    code = catalog.create_code(session, alice.id, number="N9/1042", label="MNT", name=None, color=None, activities=[])

    updated = catalog.update_code(
        session, bob.id, code.id, number="N9/1042", label="MNT v2", name="MNT v2", color=None, activities=[]
    )

    assert updated.label == "MNT v2"


def test_virtual_codes_are_not_visible_to_other_organization_members(session: Session) -> None:
    org = _make_org(session, "acme.example")
    alice = _make_user(session, "alice", org)
    bob = _make_user(session, "bob", org)
    real = catalog.create_code(session, alice.id, number="N9/1042", label="MNT", name=None, color=None, activities=[])
    catalog.create_virtual_code(session, alice.id, real_code_id=real.id, name="Alice project", color=None)

    bob_codes = catalog.list_codes(session, bob.id)

    assert [c.id for c in bob_codes] == [real.id]


def test_delete_guard_blocked_by_entry_from_another_organization_member(session: Session) -> None:
    org = _make_org(session, "acme.example")
    alice = _make_user(session, "alice", org)
    bob = _make_user(session, "bob", org)
    real = catalog.create_code(session, alice.id, number="N9/1042", label="MNT", name=None, color=None, activities=[])
    session.add(
        Entry(
            user_id=bob.id,
            date=date(2026, 7, 1),
            start_minute=540,
            end_minute=600,
            timesheet_code_id=real.id,
            activity="0001",
        )
    )
    session.commit()

    with pytest.raises(ValidationError):
        catalog.delete_code(session, alice.id, real.id)


def test_delete_guard_blocked_by_virtual_code_from_another_organization_member(session: Session) -> None:
    org = _make_org(session, "acme.example")
    alice = _make_user(session, "alice", org)
    bob = _make_user(session, "bob", org)
    real = catalog.create_code(session, alice.id, number="N9/1042", label="MNT", name=None, color=None, activities=[])
    catalog.create_virtual_code(session, bob.id, real_code_id=real.id, name="Bob project", color=None)

    with pytest.raises(ValidationError):
        catalog.delete_code(session, alice.id, real.id)


def test_delete_real_code_unused_by_anyone_in_organization_succeeds(session: Session) -> None:
    org = _make_org(session, "acme.example")
    alice = _make_user(session, "alice", org)
    bob = _make_user(session, "bob", org)
    real = catalog.create_code(session, alice.id, number="N9/1042", label="MNT", name=None, color=None, activities=[])

    catalog.delete_code(session, bob.id, real.id)

    assert catalog.list_codes(session, alice.id) == []


def test_create_code_rejects_duplicate_number_within_organization(session: Session) -> None:
    org = _make_org(session, "acme.example")
    alice = _make_user(session, "alice", org)
    bob = _make_user(session, "bob", org)
    catalog.create_code(session, alice.id, number="N9/1042", label="MNT", name=None, color=None, activities=[])

    with pytest.raises(ValidationError):
        catalog.create_code(session, bob.id, number="N9/1042", label="MNT2", name=None, color=None, activities=[])


def test_create_code_allows_same_number_in_different_organizations(session: Session) -> None:
    org_a = _make_org(session, "acme.example")
    org_b = _make_org(session, "other.example")
    alice = _make_user(session, "alice", org_a)
    carl = _make_user(session, "carl", org_b)
    catalog.create_code(session, alice.id, number="N9/1042", label="MNT", name=None, color=None, activities=[])

    carl_code = catalog.create_code(
        session, carl.id, number="N9/1042", label="Other MNT", name=None, color=None, activities=[]
    )

    assert carl_code.number == "N9/1042"


def test_add_from_reference_is_idempotent_across_organization_members(session: Session) -> None:
    # Each user's ReferenceCode comes from their own import (that catalog stays user-scoped), but
    # the copy into the *active* catalog (TimesheetCode) lands in the shared Organization catalog.
    org = _make_org(session, "acme.example")
    alice = _make_user(session, "alice", org)
    bob = _make_user(session, "bob", org)
    for user in (alice, bob):
        session.add(
            ReferenceCode(
                user_id=user.id,
                number="N9/1042",
                label="MNT",
                name="MNT",
                activities=[{"code": "0001", "label": "Bug fixing"}],
            )
        )
    session.commit()

    alice_copy = reference.add_from_reference(session, alice.id, "N9/1042")
    bob_copy = reference.add_from_reference(session, bob.id, "N9/1042")

    assert bob_copy.id == alice_copy.id
    assert len(catalog.list_codes(session, bob.id)) == 1


def test_virtual_code_still_scoped_to_owning_user_within_same_organization(session: Session) -> None:
    """Virtual codes are personal even within a shared Organization (ADR-0008 unchanged)."""
    org = _make_org(session, "acme.example")
    alice = _make_user(session, "alice", org)
    bob = _make_user(session, "bob", org)
    real = catalog.create_code(session, alice.id, number="N9/1042", label="MNT", name=None, color=None, activities=[])
    catalog.create_virtual_code(session, alice.id, real_code_id=real.id, name="Shared name", color=None)

    # Bob can create a virtual code with the same name — uniqueness is per-user, not per-organization.
    bob_virtual = catalog.create_virtual_code(session, bob.id, real_code_id=real.id, name="Shared name", color=None)

    assert bob_virtual.user_id == bob.id
