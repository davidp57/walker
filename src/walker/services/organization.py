"""Organization resolution: domain-based auto-join (see ADR-0010, BIZ-028).

Web-independent (no imports from ``walker.api``). No invite flow, no roles — the first person
signing in with a given email domain creates the Organization, anyone later on the same domain
joins it. Free-mail domains (gmail.com, outlook.com, etc.) are excluded from this: two strangers
signing in with personal Gmail accounts should never end up sharing a catalog just because they
share a mail provider, so they resolve to no Organization at all (``None``) instead.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from walker.exceptions import ValidationError
from walker.models import Organization

# Not exhaustive — common personal-email providers where sharing a domain implies nothing about
# sharing an employer. Extend as needed; a domain missing from this list just means two strangers
# on it would incorrectly end up sharing an Organization.
_FREE_MAIL_DOMAINS = frozenset(
    {
        "gmail.com",
        "googlemail.com",
        "outlook.com",
        "hotmail.com",
        "hotmail.co.uk",
        "live.com",
        "msn.com",
        "yahoo.com",
        "yahoo.co.uk",
        "icloud.com",
        "me.com",
        "mac.com",
        "aol.com",
        "protonmail.com",
        "proton.me",
        "gmx.com",
        "gmx.net",
        "mail.com",
        "yandex.com",
        "yandex.ru",
        "zoho.com",
        "fastmail.com",
    }
)


def _domain_of(email: str) -> str:
    """Extract and normalize the domain part of an email address (lowercase)."""
    local, _, domain = email.strip().lower().partition("@")
    if not local or not domain:
        raise ValidationError(f"'{email}' is not a valid email address.")
    return domain


def resolve_organization_for_email(session: Session, email: str) -> Organization | None:
    """Find the Organization for ``email``'s domain, creating one if the domain is new.

    Two different domains never merge; the same domain always resolves to the same Organization.
    Free-mail domains (``_FREE_MAIL_DOMAINS``) never create or join one — they resolve to ``None``.
    """
    domain = _domain_of(email)
    if domain in _FREE_MAIL_DOMAINS:
        return None

    org = session.scalar(select(Organization).where(Organization.email_domain == domain))
    if org is not None:
        return org

    org = Organization(email_domain=domain)
    session.add(org)
    session.commit()
    session.refresh(org)
    return org
