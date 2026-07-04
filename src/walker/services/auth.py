"""Find-or-create the ``User`` behind a successful SSO login (ADR-0010, BIZ-029).

Web-independent (no imports from ``walker.api``). Layers on top of the Organization auto-join
logic (``walker.services.organization``, BIZ-028): a successful provider callback resolves the
Organization by the user's email domain, then finds-or-creates the ``User`` under it — no separate
sign-up step, no invite flow.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from walker.models import User
from walker.services.organization import resolve_organization_for_email


def find_or_create_user_for_email(session: Session, email: str) -> User:
    """Return the ``User`` for ``email``, creating it (and its Organization) on first sign-in.

    Matching is case-insensitive on the email address, mirroring the domain matching already
    performed by ``resolve_organization_for_email``. The username is set to the email itself:
    SSO users authenticate by email, so there is no separate username to collect.
    """
    normalized_email = email.strip().lower()

    user = session.scalar(select(User).where(User.email == normalized_email))
    if user is not None:
        return user

    organization = resolve_organization_for_email(session, normalized_email)
    user = User(username=normalized_email, email=normalized_email, organization_id=organization.id)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
