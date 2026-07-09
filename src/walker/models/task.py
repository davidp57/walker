"""The Task model — a unit of work to do or being done (see CONTEXT.md, lot TASKS PRD).

A Task is the persisted, metadata-rich form of what the Timer tracks: a title (used as the Timer's
comment when started from a Task), a markdown description, a status, an optional priority and due
date, free-text tags, and an optional Timesheet-code reference (real *or* virtual, or none — orphan
Tasks are allowed). Scoped to a ``user_id`` from day one (ADR-0007).

A Task may also carry a **recurrence rule** (BIZ-025): completing a recurring Task rolls it
forward instead of staying Done — see ``services/recurrence.py`` for the rule shapes and the
next-due computation, and ``services/tasks.py`` for the roll-forward wiring.
"""

from __future__ import annotations

import enum
from datetime import date as date_type

from sqlalchemy import JSON, Date, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from walker.models.base import Base, TimestampMixin


class TaskPriority(enum.StrEnum):
    """A Task's priority, so the consultant knows what to do first."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Task(TimestampMixin, Base):
    """A Task: title + markdown description, status, priority, due date, tags, optional code.

    ``timesheet_code_id`` accepts a real *or* virtual code's id (same FK target as
    ``Entry.timesheet_code_id``); ``None`` means an orphan Task with no charge code. Tags are
    modeled as a simple JSON list of strings — free-text, no separate Tag entity, mirroring how
    little structure the domain actually needs (unlike ``Activity``, tags carry no data of their
    own beyond their text).
    """

    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text(), default=None)
    # An opaque id from the user's per-user state list (BIZ-056, ADR-0011). Stored as a free string
    # (no DB Enum/CHECK) so user-defined ids are accepted; validated in ``services/tasks``. Defaults
    # to the first default state's id for pickerless inserts.
    status: Mapped[str] = mapped_column(String(40), default="todo")
    priority: Mapped[TaskPriority | None] = mapped_column(
        Enum(TaskPriority, values_callable=lambda enum_cls: [member.value for member in enum_cls]),
        default=None,
    )
    due_date: Mapped[date_type | None] = mapped_column(Date, default=None, index=True)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    timesheet_code_id: Mapped[int | None] = mapped_column(ForeignKey("timesheet_codes.id"), default=None, index=True)
    recurrence_rule: Mapped[dict[str, object] | None] = mapped_column(JSON, default=None)
