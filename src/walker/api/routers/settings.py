"""Settings + absences endpoints (BIZ-006, BIZ-027)."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from walker.api.dependencies import get_current_user
from walker.api.schemas import AbsenceWrite, SettingsRead, SettingsUpdate, ViewPreferencesUpdate
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
