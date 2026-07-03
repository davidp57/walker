"""The ChecklistMark model — a per-fortnight "entered into T&E" tick (BIZ-005, ADR-0005)."""

from __future__ import annotations

from datetime import date as date_type

from sqlalchemy import Date, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from walker.models.base import Base, TimestampMixin


class ChecklistMark(TimestampMixin, Base):
    """Marks a single ``(code, activity, day)`` grid cell as keyed into T&E for a fortnight."""

    __tablename__ = "checklist_marks"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "fortnight_start",
            "timesheet_code_id",
            "activity",
            "day",
            name="uq_checklist_mark",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    fortnight_start: Mapped[date_type] = mapped_column(Date, index=True)
    timesheet_code_id: Mapped[int] = mapped_column(ForeignKey("timesheet_codes.id"))
    activity: Mapped[str] = mapped_column(String(255))
    day: Mapped[int] = mapped_column()
    entered: Mapped[bool] = mapped_column(default=False)
