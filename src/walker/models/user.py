"""The User model.

Authentication is out of scope for the POC (see ADR-0007), but data is scoped to a
user from day one so that multi-user becomes a later addition, not a schema migration.
"""

from __future__ import annotations

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from walker.models.base import Base, TimestampMixin


class User(TimestampMixin, Base):
    """A Walker user. For the POC a single implicit user exists (``settings.default_user``).

    ``email`` and ``organization_id`` are nullable: they exist for the domain-based auto-join
    (ADR-0010, BIZ-028) but the standalone Docker/``.exe`` targets keep running with an implicit user
    that never signs in and so never gets an email (ADR-0007). Both are backfilled with real values by
    the SSO login flow once it exists (BIZ-029).
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(255), unique=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, default=None)
    organization_id: Mapped[int | None] = mapped_column(ForeignKey("organizations.id"), default=None, index=True)
