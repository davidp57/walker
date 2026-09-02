"""Reference-catalog logic: import into it, search it, and copy a code into the active set.

Web-independent (no imports from ``walker.api``). The reference catalog can be huge (the whole firm
list); the user picks the handful they actually charge to, which are copied into ``TimesheetCode``.
"""

from __future__ import annotations

import unicodedata
from dataclasses import dataclass
from datetime import UTC, datetime

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


@dataclass(frozen=True)
class OrphanedCode:
    """An active real code whose number a complete-catalog import no longer contained (BIZ-092).

    ``virtual_codes`` is what the user cannot work out for themselves: when the missing code is a
    hidden ``backing_only`` row, the codes that visibly depend on it are the ones actually charging
    to a closed line.
    """

    id: int
    number: str
    name: str
    backing_only: bool
    virtual_codes: list[tuple[int, str]]


@dataclass(frozen=True)
class ImportOutcome:
    """What an import did to the reference catalog: rows added, refreshed, pruned, and orphaned."""

    created: int
    updated: int
    removed: int
    orphaned: list[OrphanedCode]


def _reconcile_active_codes(session: Session, user_id: int, imported_numbers: set[str]) -> list[OrphanedCode]:
    """Flag active real codes the complete catalog omits, clear the flag on those it carries (BIZ-092).

    Only meaningful for a complete-catalog import: absence from a scoped file says nothing at all.
    Nothing is retired or repointed here — a code can be missing because the export was scoped too
    narrowly, so this records a prompt and leaves the decision to the user.
    """
    real_codes = [c for c in catalog.list_codes(session, user_id) if not c.is_virtual]
    virtual_by_backing: dict[int, list[tuple[int, str]]] = {}
    for code in catalog.list_codes(session, user_id):
        if code.is_virtual and code.real_code_id is not None:
            virtual_by_backing.setdefault(code.real_code_id, []).append((code.id, code.name))

    now = datetime.now(UTC).replace(tzinfo=None)
    orphaned: list[OrphanedCode] = []
    for code in real_codes:
        if code.number in imported_numbers:
            code.missing_from_catalog_at = None
            continue
        # Keep the original date on a code already flagged: it records when the absence was first
        # claimed, and re-importing the same narrow file shouldn't make an old problem look new.
        if code.missing_from_catalog_at is None:
            code.missing_from_catalog_at = now
        orphaned.append(
            OrphanedCode(
                id=code.id,
                number=code.number,
                name=code.name,
                backing_only=code.backing_only,
                virtual_codes=virtual_by_backing.get(code.id, []),
            )
        )
    return orphaned


def import_reference(
    session: Session,
    user_id: int,
    parsed: list[ParsedCode],
    *,
    complete_catalog: bool = False,
) -> ImportOutcome:
    """Upsert parsed codes into the reference catalog by number.

    When the import carries the enriched T&E ordering keys (``customer``/``code_type``, BIZ-068), they
    are stored on the reference codes and also **backfilled onto the matching already-active real
    codes** (by number, within the user's visible catalog) so the Enter-in-Timesheet-system view can
    order to match T&E without re-activating each code.

    Args:
        session: Database session.
        user_id: Owner of the reference catalog being imported into.
        parsed: The codes read from the file.
        complete_catalog: Whether the file is the *whole* catalog. Defaults to ``False``, which makes
            the import a pure upsert — the safe reading of a file that may well be a scoped extract.
            Set it when the export really is exhaustive and reference codes it omits should go: that
            is how a charge code closed since the previous export finally stops being suggested.
            Only the reference catalog is pruned; active codes and their Entries are untouched.
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

    removed = 0
    orphaned: list[OrphanedCode] = []
    if complete_catalog:
        imported_numbers = {entry.number for entry in parsed}
        for number, ref in existing.items():
            if number not in imported_numbers:
                session.delete(ref)
                removed += 1
        orphaned = _reconcile_active_codes(session, user_id, imported_numbers)

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
    return ImportOutcome(created=created, updated=updated, removed=removed, orphaned=orphaned)


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

    ``as_backing`` (BIZ-075, ADR-0014) creates the code as a hidden **backing-only** real code — used
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
