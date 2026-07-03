"""Reference-catalog search (autocomplete over the imported catalog)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from walker.api.dependencies import get_current_user
from walker.api.schemas import ReferenceCodeRead
from walker.db import get_session
from walker.models import ReferenceCode, User
from walker.services.reference import search_reference

router = APIRouter(tags=["reference"])


@router.get("/reference", response_model=list[ReferenceCodeRead])
def search(
    q: str = Query(""),
    limit: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> list[ReferenceCode]:
    """Search the reference catalog by number, label, or name (capped)."""
    return search_reference(session, user.id, q, limit)
