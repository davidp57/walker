"""Task endpoints: CRUD + tag autocomplete (BIZ-021) + recurrence roll-forward (BIZ-025)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from walker.api.dependencies import get_current_user
from walker.api.schemas import TaskCreate, TaskRead, TaskUpdate
from walker.db import get_session
from walker.exceptions import NotFoundError, ValidationError
from walker.models import Task, User
from walker.services import tasks as task_service

router = APIRouter(tags=["tasks"])


def _task_read(task: Task) -> TaskRead:
    return TaskRead(
        id=task.id,
        title=task.title,
        description=task.description,
        status=task.status.value,
        priority=task.priority.value if task.priority is not None else None,
        due_date=task.due_date,
        tags=list(task.tags),
        timesheet_code_id=task.timesheet_code_id,
        recurrence_rule=task.recurrence_rule,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


@router.get("/tasks", response_model=list[TaskRead])
def list_tasks(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> list[TaskRead]:
    """Return the current user's Tasks."""
    return [_task_read(task) for task in task_service.list_tasks(session, user.id)]


@router.get("/tasks/tags", response_model=list[str])
def list_task_tags(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> list[str]:
    """Return every distinct tag used across the user's Tasks (for autocomplete)."""
    return task_service.list_tags(session, user.id)


@router.post("/tasks", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(
    body: TaskCreate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> TaskRead:
    """Create a Task. Orphan Tasks (no code) are allowed."""
    try:
        task = task_service.create_task(
            session,
            user.id,
            title=body.title,
            description=body.description,
            status=body.status,
            priority=body.priority,
            due_date=body.due_date,
            tags=body.tags,
            timesheet_code_id=body.timesheet_code_id,
            recurrence_rule=body.recurrence_rule,
        )
    except NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc
    return _task_read(task)


@router.put("/tasks/{task_id}", response_model=TaskRead)
def update_task(
    task_id: int,
    body: TaskUpdate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> TaskRead:
    """Update every field of a Task."""
    try:
        task = task_service.update_task(
            session,
            user.id,
            task_id,
            title=body.title,
            description=body.description,
            status=body.status,
            priority=body.priority,
            due_date=body.due_date,
            tags=body.tags,
            timesheet_code_id=body.timesheet_code_id,
            recurrence_rule=body.recurrence_rule,
        )
    except NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc
    return _task_read(task)


@router.post("/tasks/{task_id}/complete", response_model=TaskRead)
def complete_task(
    task_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> TaskRead:
    """Complete a Task: Done for a plain Task, rolled forward to To-do for a recurring one (BIZ-025)."""
    try:
        task = task_service.complete_task(session, user.id, task_id)
    except NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
    return _task_read(task)


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> Response:
    """Delete a Task."""
    try:
        task_service.delete_task(session, user.id, task_id)
    except NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)
