"""Current-user endpoint (CHR-004)."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from walker.api.dependencies import get_current_user
from walker.api.schemas import UserRead
from walker.models import User

router = APIRouter(tags=["user"])


@router.get("/user", response_model=UserRead)
def get_user(user: User = Depends(get_current_user)) -> User:
    """Return the current user (username, and display name if set)."""
    return user
