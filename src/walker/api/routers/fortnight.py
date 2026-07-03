"""Fortnight endpoint (BIZ-004)."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from walker.api.dependencies import get_current_user
from walker.api.schemas import ChecklistRead, ChecklistToggle, FortnightRead
from walker.db import get_session
from walker.models import User
from walker.services.checklist import ChecklistResult, derive_checklist, reset_checklist, toggle_mark
from walker.services.fortnight import FortnightGrid, aggregate_fortnight

router = APIRouter(tags=["fortnight"])


@router.get("/fortnight/{on_date}", response_model=FortnightRead)
def get_fortnight(
    on_date: date,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> FortnightGrid:
    """Return the aggregated T&E grid for the fortnight containing ``on_date``."""
    return aggregate_fortnight(session, user.id, on_date)


@router.get("/fortnight/{on_date}/checklist", response_model=ChecklistRead)
def get_checklist(
    on_date: date,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> ChecklistResult:
    """Return the entry checklist derived from the fortnight grid."""
    return derive_checklist(session, user.id, on_date)


@router.patch("/fortnight/{on_date}/checklist", response_model=ChecklistRead)
def toggle_checklist(
    on_date: date,
    body: ChecklistToggle,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> ChecklistResult:
    """Toggle a single checklist cell's entered state."""
    return toggle_mark(session, user.id, on_date, body.timesheet_code_id, body.activity, body.day, body.entered)


@router.delete("/fortnight/{on_date}/checklist", response_model=ChecklistRead)
def reset_checklist_endpoint(
    on_date: date,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> ChecklistResult:
    """Clear every tick for the fortnight."""
    return reset_checklist(session, user.id, on_date)
