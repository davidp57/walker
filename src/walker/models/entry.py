"""The Entry model — a tracked segment of work (ADR-0005, ADR-0006).

Captures real minutes to the minute (no rounding). An Entry with ``end_minute`` NULL is the
single running timer for its user; categorization (code, activity, description) is optional and
editable after the fact (capture-first). ``task_id`` optionally links the Entry to the Task it was
started from (BIZ-023) — ``None`` for Entries not started from a listed Task.
"""

from __future__ import annotations

from datetime import date as date_type

from sqlalchemy import Date, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from walker.models.base import Base, TimestampMixin


class Entry(TimestampMixin, Base):
    """A tracked period of work for a user on a given day, in minutes since midnight."""

    __tablename__ = "entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    date: Mapped[date_type] = mapped_column(Date, index=True)
    start_minute: Mapped[int] = mapped_column()
    end_minute: Mapped[int | None] = mapped_column(default=None)
    timesheet_code_id: Mapped[int | None] = mapped_column(ForeignKey("timesheet_codes.id"), default=None, index=True)
    activity: Mapped[str | None] = mapped_column(String(255), default=None)
    description: Mapped[str | None] = mapped_column(String(1000), default=None)
    task_id: Mapped[int | None] = mapped_column(ForeignKey("tasks.id"), default=None, index=True)
    # How the Entry was created (BIZ-065): "timer" (started from the timer) or "manual" ("+ Add
    # entry"). NULL for rows created before this was tracked — origin unknown, shown unmarked.
    source: Mapped[str | None] = mapped_column(String(10), default=None)
