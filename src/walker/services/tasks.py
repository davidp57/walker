"""Task domain logic: CRUD + tag autocomplete (BIZ-021) + recurrence roll-forward (BIZ-025).

Web-independent (must not import from ``walker.api``). A Task's ``timesheet_code_id`` may point at
a real or virtual code, or be ``None`` (an orphan Task) — no different from ``Entry`` in this
respect (see ``models/entry.py`` and ADR-0008).
"""

from __future__ import annotations

from datetime import date as date_type

from sqlalchemy import select
from sqlalchemy.orm import Session

from walker.exceptions import NotFoundError, ValidationError
from walker.models import Task, TaskPriority, TaskStatus
from walker.services import catalog
from walker.services import settings as settings_service
from walker.services.recurrence import RecurrenceRule, next_due_date, rule_from_dict, rule_to_dict

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
    """Ensure ``timesheet_code_id`` (real or virtual) is visible to ``user_id`` when provided.

    A real code is visible to every member of the user's Organization (ADR-0010, BIZ-030); a virtual
    code stays visible to its owning user only (ADR-0008).
    """
    if timesheet_code_id is None:
        return
    catalog.get_visible_code(session, user_id, timesheet_code_id)


def _validate_recurrence_rule(recurrence_rule: dict[str, object] | None) -> dict[str, object] | None:
    """Validate the recurrence rule's shape (if any) by round-tripping it through the typed rule."""
    if recurrence_rule is None:
        return None
    try:
        rule = rule_from_dict(recurrence_rule)
    except (KeyError, TypeError, ValueError) as exc:
        raise ValidationError(f"Invalid recurrence rule: {exc}") from exc
    return rule_to_dict(rule)


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
    recurrence_rule: dict[str, object] | None = None,
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
        recurrence_rule=_validate_recurrence_rule(recurrence_rule),
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
    recurrence_rule: dict[str, object] | None = None,
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
    task.recurrence_rule = _validate_recurrence_rule(recurrence_rule)
    session.commit()
    session.refresh(task)
    return task


def complete_task(session: Session, user_id: int, task_id: int) -> Task:
    """Mark a Task Done; roll a recurring Task forward instead (BIZ-025).

    A recurring Task (``recurrence_rule`` set) never actually reaches Done: completing it computes
    its next due date via the pure ``next_due_date`` function (work rhythm + absences supplied by
    ``services/settings``) and resets its status to To-do — one live instance, no history. A
    non-recurring Task is simply marked Done.
    """
    task = get_task(session, user_id, task_id)
    if task.recurrence_rule is None:
        task.status = TaskStatus.DONE
        session.commit()
        session.refresh(task)
        return task

    rule: RecurrenceRule = rule_from_dict(task.recurrence_rule)
    current_due = task.due_date if task.due_date is not None else date_type.today()
    settings_view = settings_service.get_settings(session, user_id)
    absences = {absence.date for absence in settings_view.absences}
    task.due_date = next_due_date(
        rule,
        current_due=current_due,
        workdays=settings_view.workdays,
        absences=absences,
    )
    task.status = TaskStatus.TODO
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
