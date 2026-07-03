"""The TimesheetCode model — a real PwC T&E charge code, scoped to a user."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from walker.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from walker.models.activity import Activity


class TimesheetCode(TimestampMixin, Base):
    """A T&E Timesheet code (e.g. ``N9/1042``) with its per-code activities.

    Scoped to a ``user_id`` from day one (see ADR-0007); ``number`` is unique per user.
    """

    __tablename__ = "timesheet_codes"
    __table_args__ = (UniqueConstraint("user_id", "number", name="uq_timesheet_code_user_number"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    number: Mapped[str] = mapped_column(String(50))
    label: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(255))
    color: Mapped[str] = mapped_column(String(32))

    activities: Mapped[list[Activity]] = relationship(
        back_populates="timesheet_code",
        cascade="all, delete-orphan",
        order_by="Activity.code",
    )
