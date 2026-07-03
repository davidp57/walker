"""The Absence model — a non-worked day entered for the POC (BIZ-006)."""

from __future__ import annotations

from datetime import date as date_type

from sqlalchemy import Date, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from walker.models.base import Base, TimestampMixin


class Absence(TimestampMixin, Base):
    """A user's non-worked day (leave, public holiday, …), unique per date."""

    __tablename__ = "absences"
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_absence_user_date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    date: Mapped[date_type] = mapped_column(Date, index=True)
    reason: Mapped[str] = mapped_column(String(255))
