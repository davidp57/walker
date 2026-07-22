"""Reference-catalog logic: import into it, search it, and copy a code into the active set.

Web-independent (no imports from ``walker.api``). The reference catalog can be huge (the whole firm
list); the user picks the handful they actually charge to, which are copied into ``TimesheetCode``.
"""

from __future__ import annotations

import unicodedata

from sqlalchemy import select
from sqlalchemy.orm import Session

from walker.exceptions import NotFoundError
from walker.models import ReferenceCode, TimesheetCode
from walker.services import catalog
from walker.services.catalog import ParsedActivity, ParsedCode


def normalize_for_search(text: str) -> str:
    """Fold a string to its fuzzy-search key (TEC-011): NFD-decompose, drop combining marks, lower-case,
    and keep only alphanumerics. Mirrors the frontend ``normalizeForSearch`` so "HRHUB" matches "HR Hub",
    "developpement" matches "Développement", and a bare number fragment matches inside a full code."""
    decomposed = unicodedata.normalize("NFD", text)
    without_marks = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    return "".join(ch for ch in without_marks.lower() if ch.isalnum())


def _search_blob(entry: ParsedCode) -> str:
    """Build a ReferenceCode's normalized search key from its number, names, and activity labels.

    Fields are typed ``str``, but each part is coerced with ``or ""`` so a stray ``None`` (e.g. from a
    loosely-typed importer) can never blow up the ``join``.
    """
    parts = [entry.number, entry.name, entry.label, *(a.label for a in entry.activities)]
    return normalize_for_search(" ".join(part or "" for part in parts))


def import_reference(session: Session, user_id: int, parsed: list[ParsedCode]) -> tuple[int, int]:
    """Upsert parsed codes into the reference catalog by number. Returns ``(created, updated)``.

    When the import carries the enriched T&E ordering keys (``customer``/``code_type``, BIZ-068), they
    are stored on the reference codes and also **backfilled onto the matching already-active real
    codes** (by number, within the user's visible catalog) so the Enter-in-Timesheet-system view can
    order to match T&E without re-activating each code.
    """
    existing = {
        ref.number: ref for ref in session.scalars(select(ReferenceCode).where(ReferenceCode.user_id == user_id))
    }
    created = 0
    updated = 0
    for entry in parsed:
        activities = [{"code": a.code, "label": a.label} for a in entry.activities]
        ref = existing.get(entry.number)
        if ref is None:
            ref = ReferenceCode(
                user_id=user_id,
                number=entry.number,
                label=entry.label,
                name=entry.name,
                customer=entry.customer,
                code_type=entry.code_type,
                activities=activities,
                search_blob=_search_blob(entry),
            )
            session.add(ref)
            existing[entry.number] = ref
            created += 1
        else:
            ref.label = entry.label
            ref.name = entry.name
            # Only overwrite the ordering keys when the import actually carries them, so a later
            # legacy (non-enriched) re-import can't wipe values loaded from an enriched file (BIZ-068).
            if entry.customer is not None:
                ref.customer = entry.customer
            if entry.code_type is not None:
                ref.code_type = entry.code_type
            ref.activities = activities
            ref.search_blob = _search_blob(entry)
            updated += 1

    # Backfill the ordering keys onto already-active real codes sharing the number (BIZ-068), again
    # only for the keys the import provides (never clobber existing values with None).
    active_real: dict[str, TimesheetCode] | None = None
    for entry in parsed:
        if entry.customer is None and entry.code_type is None:
            continue
        if active_real is None:
            active_real = {c.number: c for c in catalog.list_codes(session, user_id) if not c.is_virtual}
        code = active_real.get(entry.number)
        if code is not None:
            if entry.customer is not None:
                code.customer = entry.customer
            if entry.code_type is not None:
                code.code_type = entry.code_type

    session.commit()
    return created, updated


def search_reference(session: Session, user_id: int, query: str, limit: int = 20) -> list[ReferenceCode]:
    """Fuzzy-search the reference catalog, excluding codes already active, capped at ``limit`` (TEC-011).

    Matching is on the normalized ``search_blob`` (spaces/accents/punctuation ignored), so "HRHUB"
    finds "HR Hub". Codes whose number is already in the user's active catalog are filtered **in SQL**,
    so the ``limit`` returns that many *add-able* results rather than being spent on already-active ones
    that the client would then hide.
    """
    stmt = select(ReferenceCode).where(ReferenceCode.user_id == user_id)

    active_numbers = {code.resolved_number for code in catalog.list_codes(session, user_id)}
    if active_numbers:
        stmt = stmt.where(ReferenceCode.number.notin_(active_numbers))

    term = normalize_for_search(query)
    if term:
        stmt = stmt.where(ReferenceCode.search_blob.like(f"%{term}%"))

    return list(session.scalars(stmt.order_by(ReferenceCode.number).limit(limit)))


def add_from_reference(session: Session, user_id: int, number: str, *, as_backing: bool = False) -> TimesheetCode:
    """Copy a reference code (with all its activities) into the active, Organization-shared catalog.

    Idempotent: if the number is already active in the user's Organization (added by any member,
    ADR-0010), that existing real code is returned.

    ``as_backing`` (BIZ-075, ADR-0012) creates the code as a hidden **backing-only** real code — used
    when auto-materializing the backing for a virtual code, so it never surfaces in the catalog. A
    regular add (``as_backing=False``) of a code that currently exists only as a backing-only code
    **un-hides** it, promoting it to a first-class tracked code.
    """
    ref = session.scalar(select(ReferenceCode).where(ReferenceCode.user_id == user_id, ReferenceCode.number == number))
    if ref is None:
        raise NotFoundError(f"Reference code {number} not found.")

    real_codes = (code for code in catalog.list_codes(session, user_id) if not code.is_virtual)
    active = next((code for code in real_codes if code.number == number), None)
    if active is not None:
        if not as_backing and active.backing_only:
            active.backing_only = False
            session.commit()
            session.refresh(active)
        return active

    return catalog.create_code(
        session,
        user_id,
        number=ref.number,
        label=ref.label,
        name=ref.name,
        color=None,
        activities=[ParsedActivity(code=a["code"], label=a["label"]) for a in ref.activities],
        customer=ref.customer,
        code_type=ref.code_type,
        backing_only=as_backing,
    )
