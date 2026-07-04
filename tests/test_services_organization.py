"""Unit tests for the Organization auto-join logic (BIZ-028)."""

from __future__ import annotations

import pytest
from sqlalchemy.orm import Session

from walker.exceptions import ValidationError
from walker.models import Organization
from walker.services.organization import resolve_organization_for_email


def test_resolve_creates_organization_for_new_domain(session: Session) -> None:
    org = resolve_organization_for_email(session, "alice@acme.com")

    assert org.id is not None
    assert org.email_domain == "acme.com"
    assert session.query(Organization).count() == 1


def test_resolve_reuses_organization_for_existing_domain(session: Session) -> None:
    first = resolve_organization_for_email(session, "alice@acme.com")
    second = resolve_organization_for_email(session, "bob@acme.com")

    assert second.id == first.id
    assert session.query(Organization).count() == 1


def test_resolve_never_merges_different_domains(session: Session) -> None:
    acme = resolve_organization_for_email(session, "alice@acme.com")
    globex = resolve_organization_for_email(session, "carol@globex.com")

    assert acme.id != globex.id
    assert {o.email_domain for o in session.query(Organization).all()} == {"acme.com", "globex.com"}


def test_resolve_domain_matching_is_case_insensitive(session: Session) -> None:
    first = resolve_organization_for_email(session, "alice@Acme.com")
    second = resolve_organization_for_email(session, "bob@ACME.COM")

    assert second.id == first.id
    assert session.query(Organization).count() == 1


def test_resolve_rejects_email_without_domain(session: Session) -> None:
    with pytest.raises(ValidationError):
        resolve_organization_for_email(session, "not-an-email")


def test_resolve_returns_none_for_free_mail_domain(session: Session) -> None:
    org = resolve_organization_for_email(session, "alice@gmail.com")

    assert org is None
    assert session.query(Organization).count() == 0


def test_resolve_never_shares_organization_across_free_mail_users(session: Session) -> None:
    alice = resolve_organization_for_email(session, "alice@gmail.com")
    bob = resolve_organization_for_email(session, "bob@gmail.com")

    assert alice is None
    assert bob is None
    assert session.query(Organization).count() == 0
