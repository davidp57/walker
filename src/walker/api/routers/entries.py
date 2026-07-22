"""Timer + entry endpoints (capture-first — ADR-0006)."""

from __future__ import annotations

from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from walker.api.dependencies import get_current_user
from walker.api.schemas import BreakInsert, EntryCreate, EntryPatch, EntryRead, TimerSwitch
from walker.db import get_session
from walker.exceptions import NotFoundError, ValidationError
from walker.models import Entry, User
from walker.services import entries as entry_service

router = APIRouter(tags=["entries"])


def _now_minute() -> int:
    """Minutes since midnight, from the server clock (real time, no rounding)."""
    now = datetime.now()
    return now.hour * 60 + now.minute


@router.post("/timer/start", response_model=EntryRead, status_code=status.HTTP_201_CREATED)
def start_timer(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> Entry:
    """Open a running, uncategorized Entry for today."""
    try:
        return entry_service.start_timer(session, user.id, date.today(), _now_minute())
    except ValidationError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc


@router.post("/timer/switch", response_model=EntryRead, status_code=status.HTTP_201_CREATED)
def switch_timer(
    body: TimerSwitch,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> Entry:
    """Close the running Entry and open a new one, atomically.

    ``task_id`` records the start-from-Task link (BIZ-023); starting on a To-do Task moves it to
    In-progress.
    """
    try:
        return entry_service.switch_timer(
            session,
            user.id,
            date.today(),
            _now_minute(),
            timesheet_code_id=body.timesheet_code_id,
            activity=body.activity,
            description=body.description,
            task_id=body.task_id,
        )
    except NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc


@router.post("/timer/stop", response_model=EntryRead)
def stop_timer(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> Entry:
    """Close the running Entry. Leaves a linked Task's status unchanged (see ``/timer/complete``)."""
    try:
        return entry_service.stop_timer(session, user.id, _now_minute())
    except ValidationError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc


@router.post("/timer/complete", response_model=EntryRead)
def complete_timer(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> Entry:
    """Close the running Entry and mark its linked Task Done, in one call (BIZ-023)."""
    try:
        return entry_service.complete_timer(session, user.id, _now_minute())
    except ValidationError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc


@router.post("/entries", response_model=EntryRead, status_code=status.HTTP_201_CREATED)
def create_entry(
    body: EntryCreate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> Entry:
    """Create a completed Entry manually (no timer) — for past or future time."""
    on_date = body.date or date.today()
    start = body.start_minute if body.start_minute is not None else 9 * 60
    end = body.end_minute if body.end_minute is not None else start + 60
    return entry_service.create_entry(
        session,
        user.id,
        on_date=on_date,
        start_minute=start,
        end_minute=end,
        timesheet_code_id=body.timesheet_code_id,
        activity=body.activity,
        description=body.description,
        task_id=body.task_id,
    )


@router.get("/entries", response_model=list[EntryRead])
def list_entries(
    on_date: date | None = Query(None, alias="date"),
    date_from: date | None = Query(None, alias="from"),
    date_to: date | None = Query(None, alias="to"),
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> list[Entry]:
    """List the current user's entries for a single day (``date``) or a range (``from``/``to``)."""
    if date_from is not None and date_to is not None:
        return entry_service.list_entries_range(session, user.id, date_from, date_to)
    if on_date is not None:
        return entry_service.list_entries(session, user.id, on_date)
    raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Provide 'date' or both 'from' and 'to'.")


@router.patch("/entries/{entry_id}", response_model=EntryRead)
def patch_entry(
    entry_id: int,
    body: EntryPatch,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> Entry:
    """Edit any field of an Entry."""
    try:
        return entry_service.patch_entry(session, user.id, entry_id, body.model_dump(exclude_unset=True))
    except NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc


@router.post("/entries/{entry_id}/break", response_model=list[EntryRead])
def insert_break(
    entry_id: int,
    body: BreakInsert,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> list[Entry]:
    """Punch a hole in an entry, splitting the worked time around it (BIZ-076).

    On a running entry the break is bounded by the current minute and the timer keeps running from
    the break end. Returns the resulting entries (worked segments + optional hole entry)."""
    try:
        return entry_service.insert_break(
            session,
            user.id,
            entry_id,
            break_start=body.break_start_minute,
            break_end=body.break_end_minute,
            now_minute=_now_minute(),
            timesheet_code_id=body.timesheet_code_id,
            activity=body.activity,
            description=body.description,
        )
    except NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc


@router.delete("/entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(
    entry_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> Response:
    """Delete an Entry."""
    try:
        entry_service.delete_entry(session, user.id, entry_id)
    except NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)
