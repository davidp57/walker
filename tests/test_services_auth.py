"""Unit tests for the SSO find-or-create-user logic (BIZ-029)."""

from __future__ import annotations

from sqlalchemy.orm import Session

from walker.models import Organization, User
from walker.services.auth import find_or_create_user_for_email


def test_creates_user_and_organization_on_first_login(session: Session) -> None:
    user = find_or_create_user_for_email(session, "alice@acme.com")

    assert user.id is not None
    assert user.email == "alice@acme.com"
    assert user.username == "alice@acme.com"
    org = session.get(Organization, user.organization_id)
    assert org is not None
    assert org.email_domain == "acme.com"


def test_reuses_existing_user_for_same_email(session: Session) -> None:
    first = find_or_create_user_for_email(session, "alice@acme.com")
    second = find_or_create_user_for_email(session, "alice@acme.com")

    assert second.id == first.id
    assert session.query(User).count() == 1


def test_joins_existing_organization_for_same_domain(session: Session) -> None:
    alice = find_or_create_user_for_email(session, "alice@acme.com")
    bob = find_or_create_user_for_email(session, "bob@acme.com")

    assert bob.organization_id == alice.organization_id
    assert session.query(Organization).count() == 1


def test_email_matching_is_case_insensitive(session: Session) -> None:
    first = find_or_create_user_for_email(session, "Alice@Acme.com")
    second = find_or_create_user_for_email(session, "alice@acme.com")

    assert second.id == first.id
    assert session.query(User).count() == 1
