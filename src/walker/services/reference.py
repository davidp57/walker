"""Reference-catalog logic: import into it, search it, and copy a code into the active set.

Web-independent (no imports from ``walker.api``). The reference catalog can be huge (the whole firm
list); the user picks the handful they actually charge to, which are copied into ``TimesheetCode``.
"""

from __future__ import annotations

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from walker.exceptions import NotFoundError
from walker.models import ReferenceCode, TimesheetCode
from walker.services import catalog
from walker.services.catalog import ParsedActivity, ParsedCode


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
    """Search the reference catalog by number/label/name (case-insensitive), capped at ``limit``."""
    stmt = select(ReferenceCode).where(ReferenceCode.user_id == user_id)
    term = query.strip()
    if term:
        like = f"%{term}%"
        stmt = stmt.where(
            or_(
                ReferenceCode.number.ilike(like),
                ReferenceCode.label.ilike(like),
                ReferenceCode.name.ilike(like),
            )
        )
    return list(session.scalars(stmt.order_by(ReferenceCode.number).limit(limit)))


def add_from_reference(session: Session, user_id: int, number: str) -> TimesheetCode:
    """Copy a reference code (with all its activities) into the active, Organization-shared catalog.

    Idempotent: if the number is already active in the user's Organization (added by any member,
    ADR-0010), that existing real code is returned unchanged.
    """
    ref = session.scalar(select(ReferenceCode).where(ReferenceCode.user_id == user_id, ReferenceCode.number == number))
    if ref is None:
        raise NotFoundError(f"Reference code {number} not found.")

    real_codes = (code for code in catalog.list_codes(session, user_id) if not code.is_virtual)
    active = next((code for code in real_codes if code.number == number), None)
    if active is not None:
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
    )
