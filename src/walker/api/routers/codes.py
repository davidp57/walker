"""Code catalog endpoints: read, CRUD, and file import (BIZ-001 / BIZ-002)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from walker.api.dependencies import get_current_user
from walker.api.schemas import (
    ActivityWrite,
    AddFromReference,
    CodeCreate,
    CodeRead,
    CodeUpdate,
    ImportSummary,
)
from walker.db import get_session
from walker.exceptions import CatalogImportError, NotFoundError, ValidationError
from walker.models import TimesheetCode, User
from walker.services import catalog, reference
from walker.services.catalog import ParsedActivity

router = APIRouter(tags=["codes"])


def _activities(items: list[ActivityWrite]) -> list[ParsedActivity]:
    return [ParsedActivity(code=item.code, label=item.label) for item in items]


@router.get("/codes", response_model=list[CodeRead])
def list_codes(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> list[TimesheetCode]:
    """Return the current user's codes, each with its activities, ordered by number."""
    codes = session.scalars(
        select(TimesheetCode).where(TimesheetCode.user_id == user.id).order_by(TimesheetCode.number)
    ).all()
    return list(codes)


@router.post("/codes", response_model=CodeRead, status_code=status.HTTP_201_CREATED)
def create_code(
    body: CodeCreate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> TimesheetCode:
    """Create a code (+ activities)."""
    try:
        return catalog.create_code(
            session,
            user.id,
            number=body.number,
            label=body.label,
            name=body.name,
            color=body.color,
            activities=_activities(body.activities),
        )
    except ValidationError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc


@router.put("/codes/{code_id}", response_model=CodeRead)
def update_code(
    code_id: int,
    body: CodeUpdate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> TimesheetCode:
    """Update a code and replace its activities."""
    try:
        return catalog.update_code(
            session,
            user.id,
            code_id,
            number=body.number,
            label=body.label,
            name=body.name,
            color=body.color,
            activities=_activities(body.activities),
        )
    except NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc


@router.delete("/codes/{code_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_code(
    code_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> Response:
    """Delete a code, unless an Entry references it."""
    try:
        catalog.delete_code(session, user.id, code_id)
    except NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/codes/from-reference", response_model=CodeRead, status_code=status.HTTP_201_CREATED)
def add_from_reference(
    body: AddFromReference,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> TimesheetCode:
    """Copy a reference code (with all its activities) into the user's active codes."""
    try:
        return reference.add_from_reference(session, user.id, body.number)
    except NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc


@router.post("/catalog/import", response_model=ImportSummary)
def import_catalog(
    file: UploadFile = File(),
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> ImportSummary:
    """Import a hierarchical CSV into the reference catalog, upserting by number."""
    content = file.file.read().decode("utf-8-sig")
    try:
        parsed = catalog.parse_catalog_csv(content)
    except CatalogImportError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    created, updated = reference.import_reference(session, user.id, parsed)
    return ImportSummary(created=created, updated=updated)
