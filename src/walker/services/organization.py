"""Organization resolution: domain-based auto-join (see ADR-0010, BIZ-028).

Web-independent (no imports from ``walker.api``). No invite flow, no roles — the first person
signing in with a given email domain creates the Organization, anyone later on the same domain
joins it.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from walker.exceptions import ValidationError
from walker.models import Organization


def _domain_of(email: str) -> str:
    """Extract and normalize the domain part of an email address (lowercase)."""
    local, _, domain = email.strip().lower().partition("@")
    if not local or not domain:
        raise ValidationError(f"'{email}' is not a valid email address.")
    return domain


def resolve_organization_for_email(session: Session, email: str) -> Organization:
    """Find the Organization for ``email``'s domain, creating one if the domain is new.

    Two different domains never merge; the same domain always resolves to the same Organization.
    """
    domain = _domain_of(email)

    org = session.scalar(select(Organization).where(Organization.email_domain == domain))
    if org is not None:
        return org

    org = Organization(email_domain=domain)
    session.add(org)
    session.commit()
    session.refresh(org)
    return org
