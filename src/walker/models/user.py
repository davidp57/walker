"""The User model.

Authentication is out of scope for the POC (see ADR-0007), but data is scoped to a
user from day one so that multi-user becomes a later addition, not a schema migration.
"""

from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from walker.models.base import Base, TimestampMixin


class User(TimestampMixin, Base):
    """A Walker user. For the POC a single implicit user exists (``settings.default_user``)."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(255), unique=True)
