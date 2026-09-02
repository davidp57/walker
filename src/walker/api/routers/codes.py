"""Code catalog endpoints: read, CRUD, and file import (BIZ-001 / BIZ-002)."""

from __future__ import annotations

from datetime import date, datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from walker.api.dependencies import get_current_user
from walker.api.schemas import (
    ActivityRead,
    ActivityWrite,
    AddFromReference,
    BlockingEntriesRead,
    CodeCreate,
    CodeRead,
    CodeTotalsRead,
    CodeUpdate,
    EntryRead,
    ImportSummary,
    LikelyCodeRead,
    OrphanedCodeRead,
    ReassignBlockingEntries,
    SetObsolete,
    VirtualCodeCreate,
    VirtualCodeRef,
    VirtualCodeUpdate,
)
from walker.db import get_session
from walker.exceptions import CatalogImportError, NotFoundError, ValidationError
from walker.models import TimesheetCode, User
from walker.services import catalog, code_totals, likely_codes, reference
from walker.services.catalog import ParsedActivity
from walker.services.likely_codes import DEFAULT_LIKELY_COUNT, MAX_LIKELY_COUNT

router = APIRouter(tags=["codes"])


def _activities(items: list[ActivityWrite]) -> list[ParsedActivity]:
    return [ParsedActivity(code=item.code, label=item.label) for item in items]


def _code_read(code: TimesheetCode) -> CodeRead:
    """Build the API representation, resolving number/label/activities (ADR-0008)."""
    return CodeRead(
        id=code.id,
        number=code.resolved_number,
        label=code.resolved_label,
        name=code.name,
        color=code.color,
        activities=[ActivityRead(code=a.code, label=a.label) for a in code.resolved_activities],
        customer=code.resolved_customer,
        type=code.resolved_type,
        is_virtual=code.is_virtual,
        real_code_id=code.real_code_id,
        real_code_number=code.real_code.number if code.real_code is not None else None,
        backing_only=code.backing_only,
        obsolete=code.obsolete,
        # BIZ-092: a virtual code has no number of its own in the catalog, so the flag it should
        # display is its backing's — that is the code whose charge line went missing.
        missing_from_catalog=(
            code.real_code.missing_from_catalog_at is not None
            if code.is_virtual and code.real_code is not None
            else code.missing_from_catalog_at is not None
        ),
    )


@router.get("/codes", response_model=list[CodeRead])
def list_codes(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> list[CodeRead]:
    """Return the codes visible to the current user: their Organization's real codes + their own virtual codes."""
    codes = catalog.list_codes(session, user.id)
    return [_code_read(code) for code in codes]


@router.get("/codes/likely", response_model=list[LikelyCodeRead])
def list_likely_codes(
    at: datetime,
    limit: int = Query(DEFAULT_LIKELY_COUNT, ge=1, le=MAX_LIKELY_COUNT),
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> list[LikelyCodeRead]:
    """Return the (code, activity) pairs the user usually works on around ``at`` (BIZ-083, ADR-0015).

    ``at`` is the moment being categorized — "now" from the Timer, the start time being typed from the
    entry editor — and is required: without a context there is nothing to rank against. An empty list
    means nothing cleared the habit threshold, and the caller shows no band.

    ``limit`` starts at 1 on purpose: a disabled band (``likely_count`` 0, BIZ-084) means the SPA does
    not call this at all, so asking for zero rows is a client bug, not a way to switch the band off.
    """
    ranked = likely_codes.likely_codes(session, user.id, at=at, limit=limit)
    return [
        LikelyCodeRead(
            code_id=code.id,
            number=code.resolved_number,
            name=code.name,
            color=code.color,
            activity=activity,
        )
        for code, activity in likely_codes.resolve(session, user.id, ranked)
    ]


@router.get("/codes/{code_id}/totals", response_model=CodeTotalsRead)
def get_code_totals(
    code_id: int,
    date_from: date | None = Query(None, alias="from"),
    date_to: date | None = Query(None, alias="to"),
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> CodeTotalsRead:
    """How much time the user spent on this code over ``from``–``to`` (BIZ-089).

    Both bounds are optional and inclusive; omitting them totals **all time**, which is the most
    common form of the question and needs no date input. Unlike ``/period/{on_date}`` the range is
    arbitrary — it may span several Timesheet periods, or none completely.
    """
    try:
        totals = code_totals.code_totals(session, user.id, code_id, start=date_from, end=date_to)
    except NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc
    return CodeTotalsRead.model_validate(totals)


@router.post("/codes", response_model=CodeRead, status_code=status.HTTP_201_CREATED)
def create_code(
    body: CodeCreate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> CodeRead:
    """Create a code (+ activities)."""
    try:
        code = catalog.create_code(
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
    return _code_read(code)


@router.post("/codes/virtual", response_model=CodeRead, status_code=status.HTTP_201_CREATED)
def create_virtual_code(
    body: VirtualCodeCreate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> CodeRead:
    """Create a virtual code backed by a real code (ADR-0008)."""
    try:
        code = catalog.create_virtual_code(
            session,
            user.id,
            real_code_id=body.real_code_id,
            name=body.name,
            color=body.color,
        )
    except NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    return _code_read(code)


@router.put("/codes/virtual/{code_id}", response_model=CodeRead)
def update_virtual_code(
    code_id: int,
    body: VirtualCodeUpdate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> CodeRead:
    """Update a virtual code's name, colour, and/or backing real code (ADR-0008)."""
    try:
        code = catalog.update_virtual_code(
            session,
            user.id,
            code_id,
            real_code_id=body.real_code_id,
            name=body.name,
            color=body.color,
        )
    except NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    return _code_read(code)


@router.put("/codes/{code_id}", response_model=CodeRead)
def update_code(
    code_id: int,
    body: CodeUpdate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> CodeRead:
    """Update a code and replace its activities."""
    try:
        code = catalog.update_code(
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
    return _code_read(code)


@router.put("/codes/{code_id}/obsolete", response_model=CodeRead)
def set_code_obsolete(
    code_id: int,
    body: SetObsolete,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> CodeRead:
    """Retire a code, or bring it back (BIZ-090).

    With ``sweep``, the caller's own Entries in that window move onto the replacement code + activity
    **before** the flag is applied, so the retired code is left carrying only what predates the window.
    The SPA passes the open Timesheet period: earlier periods have already been keyed into the
    Timesheet system, and rewriting them would put Walker out of step with what was declared.

    For a **real** code the flag is Organization-wide — the row is shared (BIZ-030, ADR-0010).
    """
    try:
        if body.sweep is not None:
            catalog.reassign_entries_in_range(
                session,
                user.id,
                code_id,
                target_code_id=body.sweep.target_code_id,
                activity=body.sweep.activity,
                start=body.sweep.start,
                end=body.sweep.end,
            )
        return _code_read(catalog.set_obsolete(session, user.id, code_id, obsolete=body.obsolete))
    except NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc


@router.delete("/codes/{code_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_code(
    code_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> Response:
    """Delete a code, unless an Entry references it.

    The 409 body now says how many entries block it, over what range, for how many minutes (BIZ-088)
    — see ``GET /codes/{code_id}/blocking-entries`` to resolve them.
    """
    try:
        catalog.delete_code(session, user.id, code_id)
    except NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _blocking_read(session: Session, user_id: int, code_id: int) -> BlockingEntriesRead:
    """Build the blocking-entries payload: Organization-wide counts + the caller's own rows."""
    summary = catalog.blocking_entries(session, user_id, code_id)
    return BlockingEntriesRead(
        total=summary.total,
        own=summary.own,
        others=summary.others,
        first_date=summary.first_date,
        last_date=summary.last_date,
        minutes=summary.minutes,
        entries=[EntryRead.model_validate(e) for e in catalog.list_blocking_entries(session, user_id, code_id)],
    )


@router.get("/codes/{code_id}/blocking-entries", response_model=BlockingEntriesRead)
def list_blocking_entries(
    code_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> BlockingEntriesRead:
    """The Entries preventing this code's deletion (BIZ-088).

    Counts span the whole Organization so the block is explainable; ``entries`` holds only the
    caller's own — the ones the two resolve endpoints below can act on.
    """
    try:
        return _blocking_read(session, user.id, code_id)
    except NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc


@router.post("/codes/{code_id}/blocking-entries/reassign", response_model=BlockingEntriesRead)
def reassign_blocking_entries(
    code_id: int,
    body: ReassignBlockingEntries,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> BlockingEntriesRead:
    """Move the caller's blocking Entries onto another code + activity (BIZ-088).

    Returns the refreshed summary, so a caller left blocked by another member's entries sees why
    without a second request.
    """
    try:
        catalog.reassign_blocking_entries(
            session, user.id, code_id, target_code_id=body.target_code_id, activity=body.activity
        )
        return _blocking_read(session, user.id, code_id)
    except NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc


@router.delete("/codes/{code_id}/blocking-entries", response_model=BlockingEntriesRead)
def delete_blocking_entries(
    code_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> BlockingEntriesRead:
    """Delete the caller's blocking Entries (BIZ-088) — destructive, captured time is lost."""
    try:
        catalog.delete_blocking_entries(session, user.id, code_id)
        return _blocking_read(session, user.id, code_id)
    except NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc


@router.post("/codes/from-reference", response_model=CodeRead, status_code=status.HTTP_201_CREATED)
def add_from_reference(
    body: AddFromReference,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> CodeRead:
    """Copy a reference code (with all its activities) into the user's active codes."""
    try:
        code = reference.add_from_reference(session, user.id, body.number, as_backing=body.as_backing)
    except NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
    return _code_read(code)


@router.post("/catalog/import", response_model=ImportSummary)
def import_catalog(
    file: UploadFile = File(),
    complete_catalog: bool = Form(default=False),
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> ImportSummary:
    """Import a hierarchical CSV into the reference catalog, upserting by number.

    ``complete_catalog`` declares the file exhaustive, which additionally prunes reference codes it
    omits — the only way a charge code closed since the previous export stops being suggested. It
    defaults off because a scoped extract is just as likely, and pruning on one would empty the
    catalog.
    """
    content = file.file.read().decode("utf-8-sig")
    try:
        parsed = catalog.parse_catalog_csv(content)
    except CatalogImportError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    outcome = reference.import_reference(session, user.id, parsed, complete_catalog=complete_catalog)
    return ImportSummary(
        created=outcome.created,
        updated=outcome.updated,
        removed=outcome.removed,
        orphaned=[
            OrphanedCodeRead(
                id=orphan.id,
                number=orphan.number,
                name=orphan.name,
                backing_only=orphan.backing_only,
                virtual_codes=[VirtualCodeRef(id=vid, name=vname) for vid, vname in orphan.virtual_codes],
            )
            for orphan in outcome.orphaned
        ],
    )
