"""Task domain logic: CRUD + tag autocomplete (BIZ-021).

Web-independent (must not import from ``walker.api``). A Task's ``timesheet_code_id`` may point at
a real or virtual code, or be ``None`` (an orphan Task) — no different from ``Entry`` in this
respect (see ``models/entry.py`` and ADR-0008).
"""

from __future__ import annotations

from datetime import date as date_type

from sqlalchemy import select
from sqlalchemy.orm import Session

from walker.exceptions import NotFoundError, ValidationError
from walker.models import Task, TaskPriority, TaskStatus, TimesheetCode

_VALID_STATUSES = {member.value for member in TaskStatus}
_VALID_PRIORITIES = {member.value for member in TaskPriority}


def _validate_status(status: str) -> TaskStatus:
    if status not in _VALID_STATUSES:
        raise ValidationError(f"Unknown status: {status!r}.")
    return TaskStatus(status)


def _validate_priority(priority: str | None) -> TaskPriority | None:
    if priority is None:
        return None
    if priority not in _VALID_PRIORITIES:
        raise ValidationError(f"Unknown priority: {priority!r}.")
    return TaskPriority(priority)


def _validate_code(session: Session, user_id: int, timesheet_code_id: int | None) -> None:
    """Ensure ``timesheet_code_id`` (real or virtual) is owned by ``user_id`` when provided."""
    if timesheet_code_id is None:
        return
    code = session.get(TimesheetCode, timesheet_code_id)
    if code is None or code.user_id != user_id:
        raise NotFoundError(f"Code {timesheet_code_id} not found.")


def list_tasks(session: Session, user_id: int) -> list[Task]:
    """Return the user's Tasks, most recently updated first (``id`` breaks same-instant ties)."""
    return list(
        session.scalars(select(Task).where(Task.user_id == user_id).order_by(Task.updated_at.desc(), Task.id.desc()))
    )


def get_task(session: Session, user_id: int, task_id: int) -> Task:
    """Return the user's Task or raise ``NotFoundError``."""
    task = session.get(Task, task_id)
    if task is None or task.user_id != user_id:
        raise NotFoundError(f"Task {task_id} not found.")
    return task


def create_task(
    session: Session,
    user_id: int,
    *,
    title: str,
    description: str | None,
    status: str,
    priority: str | None,
    due_date: date_type | None,
    tags: list[str],
    timesheet_code_id: int | None,
) -> Task:
    """Create a Task. Orphan Tasks (``timesheet_code_id`` ``None``) are allowed."""
    _validate_code(session, user_id, timesheet_code_id)
    task = Task(
        user_id=user_id,
        title=title,
        description=description,
        status=_validate_status(status),
        priority=_validate_priority(priority),
        due_date=due_date,
        tags=list(tags),
        timesheet_code_id=timesheet_code_id,
    )
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


def update_task(
    session: Session,
    user_id: int,
    task_id: int,
    *,
    title: str,
    description: str | None,
    status: str,
    priority: str | None,
    due_date: date_type | None,
    tags: list[str],
    timesheet_code_id: int | None,
) -> Task:
    """Replace every field of a Task."""
    task = get_task(session, user_id, task_id)
    _validate_code(session, user_id, timesheet_code_id)
    task.title = title
    task.description = description
    task.status = _validate_status(status)
    task.priority = _validate_priority(priority)
    task.due_date = due_date
    task.tags = list(tags)
    task.timesheet_code_id = timesheet_code_id
    session.commit()
    session.refresh(task)
    return task


def delete_task(session: Session, user_id: int, task_id: int) -> None:
    """Delete a Task."""
    task = get_task(session, user_id, task_id)
    session.delete(task)
    session.commit()


def list_tags(session: Session, user_id: int) -> list[str]:
    """Return every distinct tag used across the user's Tasks, sorted alphabetically.

    Backs the tag-autocomplete UI (BIZ-021 acceptance criterion): tags are free-text, so the
    suggestion pool is simply what has been typed before.
    """
    tasks = session.scalars(select(Task).where(Task.user_id == user_id)).all()
    tags: set[str] = set()
    for task in tasks:
        tags.update(task.tags)
    return sorted(tags)
