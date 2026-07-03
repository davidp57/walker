"""The Settings model — per-user work rhythm + display density (BIZ-006)."""

from __future__ import annotations

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from walker.models.base import Base, TimestampMixin

# Work rhythm as a 7-char "0/1" string, Sunday-first (Sun..Sat). Default: Mon–Fri worked.
DEFAULT_WORKDAYS = "0111110"


class Settings(TimestampMixin, Base):
    """A user's settings: which weekdays are workdays, and the grid density."""

    __tablename__ = "settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    workdays: Mapped[str] = mapped_column(String(7), default=DEFAULT_WORKDAYS)
    density: Mapped[str] = mapped_column(String(20), default="comfortable")
