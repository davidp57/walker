"""The ChecklistMark model — a per-Timesheet-period "entered into the Timesheet system" tick (BIZ-005, ADR-0005)."""

from __future__ import annotations

from datetime import date as date_type

from sqlalchemy import Date, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from walker.models.base import Base, TimestampMixin


class ChecklistMark(TimestampMixin, Base):
    """Marks a single ``(code, activity, day)`` grid cell as keyed into the Timesheet system for a Timesheet period."""

    __tablename__ = "checklist_marks"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "period_start",
            "timesheet_code_id",
            "activity",
            "day",
            name="uq_checklist_mark",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    period_start: Mapped[date_type] = mapped_column(Date, index=True)
    timesheet_code_id: Mapped[int] = mapped_column(ForeignKey("timesheet_codes.id"))
    activity: Mapped[str] = mapped_column(String(255))
    # Day-of-month, scoped by `period_start` — see `PeriodRow.minutes_by_day`'s docstring for why this
    # stays unambiguous even for a `weekly` period crossing a month boundary.
    day: Mapped[int] = mapped_column()
    entered: Mapped[bool] = mapped_column(default=False)
