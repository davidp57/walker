"""The Activity model — a Timesheet-system activity (sub-code) belonging to one TimesheetCode."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from walker.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from walker.models.timesheet_code import TimesheetCode


class Activity(TimestampMixin, Base):
    """An activity under a TimesheetCode: a Timesheet-system sub-``code`` plus a human ``label``."""

    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(primary_key=True)
    timesheet_code_id: Mapped[int] = mapped_column(ForeignKey("timesheet_codes.id", ondelete="CASCADE"), index=True)
    code: Mapped[str] = mapped_column(String(50))
    label: Mapped[str] = mapped_column(String(255))

    timesheet_code: Mapped[TimesheetCode] = relationship(back_populates="activities")
