"""Timesheet period endpoint (BIZ-004, BIZ-027)."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from walker.api.dependencies import get_current_user
from walker.api.schemas import ChecklistRead, ChecklistToggle, PeriodRead
from walker.db import get_session
from walker.models import User
from walker.services.checklist import ChecklistResult, derive_checklist, reset_checklist, toggle_mark
from walker.services.period import PeriodGrid, aggregate_period
from walker.services.settings import get_settings

router = APIRouter(tags=["period"])


@router.get("/period/{on_date}", response_model=PeriodRead)
def get_period(
    on_date: date,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> PeriodGrid:
    """Return the aggregated Timesheet-system grid for the Timesheet period containing ``on_date``."""
    scheme = get_settings(session, user.id).period_scheme
    return aggregate_period(session, user.id, scheme, on_date)


@router.get("/period/{on_date}/checklist", response_model=ChecklistRead)
def get_checklist(
    on_date: date,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> ChecklistResult:
    """Return the entry checklist derived from the Timesheet period grid."""
    return derive_checklist(session, user.id, on_date)


@router.patch("/period/{on_date}/checklist", response_model=ChecklistRead)
def toggle_checklist(
    on_date: date,
    body: ChecklistToggle,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> ChecklistResult:
    """Toggle a single checklist cell's entered state."""
    return toggle_mark(session, user.id, on_date, body.timesheet_code_id, body.activity, body.day, body.entered)


@router.delete("/period/{on_date}/checklist", response_model=ChecklistRead)
def reset_checklist_endpoint(
    on_date: date,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> ChecklistResult:
    """Clear every tick for the Timesheet period."""
    return reset_checklist(session, user.id, on_date)
