"""Settings + absences endpoints (BIZ-006, BIZ-027)."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from walker.api.dependencies import get_current_user
from walker.api.schemas import (
    AbsenceWrite,
    SettingsRead,
    SettingsUpdate,
    TaskStateAdd,
    TaskStateRename,
    TaskStateReorder,
    ViewPreferencesUpdate,
)
from walker.db import get_session
from walker.exceptions import ValidationError
from walker.models import User
from walker.services import settings as settings_service
from walker.services.settings import SettingsView

router = APIRouter(tags=["settings"])


@router.get("/settings", response_model=SettingsRead)
def get_settings(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> SettingsView:
    """Return the user's settings (work rhythm, density, period scheme, theme, absences)."""
    return settings_service.get_settings(session, user.id)


@router.put("/settings", response_model=SettingsRead)
def update_settings(
    body: SettingsUpdate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> SettingsView:
    """Update the work rhythm, density, and (optionally) the Timesheet period scheme/theme."""
    return settings_service.update_settings(
        session,
        user.id,
        workdays=body.workdays,
        density=body.density,
        period_scheme=body.period_scheme,
        theme=body.theme,
    )


@router.patch("/view-preferences", response_model=SettingsRead)
def update_view_preferences(
    body: ViewPreferencesUpdate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> SettingsView:
    """Merge a partial view-preferences patch (task view/group/sort, period mode, Done collapse)."""
    return settings_service.update_view_preferences(session, user.id, body.model_dump(exclude_unset=True))


@router.post("/settings/absences", response_model=SettingsRead)
def add_absence(
    body: AbsenceWrite,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> SettingsView:
    """Add (or update the reason of) an absence — a single day, or a range when ``end`` is set."""
    try:
        return settings_service.add_absence(session, user.id, body.date, body.reason, end=body.end)
    except ValidationError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc


@router.delete("/settings/absences/{on_date}", response_model=SettingsRead)
def remove_absence(
    on_date: date,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> SettingsView:
    """Remove an absence for a date."""
    return settings_service.remove_absence(session, user.id, on_date)


# --- Task states (BIZ-056, ADR-0011) — per-user ordered state list; every op returns full settings.


@router.post("/task-states", response_model=SettingsRead, status_code=status.HTTP_201_CREATED)
def add_task_state(
    body: TaskStateAdd,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> SettingsView:
    """Add a task state, inserted before the terminal one (ADR-0011)."""
    try:
        return settings_service.add_task_state(session, user.id, body.label)
    except ValidationError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc


@router.patch("/task-states/{state_id}", response_model=SettingsRead)
def rename_task_state(
    state_id: str,
    body: TaskStateRename,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> SettingsView:
    """Rename a task state's label (its id is untouched, so Tasks keep their status)."""
    try:
        return settings_service.rename_task_state(session, user.id, state_id, body.label)
    except ValidationError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc


@router.put("/task-states/order", response_model=SettingsRead)
def reorder_task_states(
    body: TaskStateReorder,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> SettingsView:
    """Reorder the task states — re-pointing the initial/terminal (first/last) roles (ADR-0011)."""
    try:
        return settings_service.reorder_task_states(session, user.id, body.ordered_ids)
    except ValidationError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc


@router.delete("/task-states/{state_id}", response_model=SettingsRead)
def delete_task_state(
    state_id: str,
    reassign_to: str | None = None,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> SettingsView:
    """Delete a task state (blocked at 2); a non-empty state's Tasks move to ``reassign_to``."""
    try:
        return settings_service.delete_task_state(session, user.id, state_id, reassign_to)
    except ValidationError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc
