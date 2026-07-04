"""The Organization model — a group of Users who share one real-code catalog (see ADR-0010)."""

from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from walker.models.base import Base, TimestampMixin


class Organization(TimestampMixin, Base):
    """A group of Users on the same email domain, formed automatically at sign-in (ADR-0010).

    The real-code catalog (``TimesheetCode`` rows with ``real_code_id`` ``None``) will be scoped to
    the Organization rather than the ``User`` (BIZ-030); this model only introduces the entity and the
    domain-based auto-join (BIZ-028).
    """

    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(primary_key=True)
    email_domain: Mapped[str] = mapped_column(String(255), unique=True)
