"""Reference-catalog logic: import into it, search it, and copy a code into the active set.

Web-independent (no imports from ``walker.api``). The reference catalog can be huge (the whole firm
list); the user picks the handful they actually charge to, which are copied into ``TimesheetCode``.
"""

from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from walker.exceptions import NotFoundError
from walker.models import Activity, ReferenceCode, TimesheetCode
from walker.services.catalog import PALETTE, ParsedCode


def import_reference(session: Session, user_id: int, parsed: list[ParsedCode]) -> tuple[int, int]:
    """Upsert parsed codes into the reference catalog by number. Returns ``(created, updated)``."""
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
                activities=activities,
            )
            session.add(ref)
            existing[entry.number] = ref
            created += 1
        else:
            ref.label = entry.label
            ref.name = entry.name
            ref.activities = activities
            updated += 1
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
    """Copy a reference code (with all its activities) into the active codes (idempotent)."""
    ref = session.scalar(select(ReferenceCode).where(ReferenceCode.user_id == user_id, ReferenceCode.number == number))
    if ref is None:
        raise NotFoundError(f"Reference code {number} not found.")

    active = session.scalar(
        select(TimesheetCode).where(TimesheetCode.user_id == user_id, TimesheetCode.number == number)
    )
    if active is not None:
        return active

    count = session.scalar(select(func.count()).select_from(TimesheetCode).where(TimesheetCode.user_id == user_id)) or 0
    code = TimesheetCode(
        user_id=user_id,
        number=ref.number,
        label=ref.label,
        name=ref.name,
        color=PALETTE[count % len(PALETTE)],
        activities=[Activity(code=a["code"], label=a["label"]) for a in ref.activities],
    )
    session.add(code)
    session.commit()
    session.refresh(code)
    return code
