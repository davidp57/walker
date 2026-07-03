"""FastAPI dependencies shared across routers."""

from __future__ import annotations

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from walker.config import settings
from walker.db import get_session
from walker.models import User


def get_current_user(session: Session = Depends(get_session)) -> User:
    """Return the implicit POC user, creating it on first use (see ADR-0007).

    There is no authentication yet; all data is scoped to this single user so that
    multi-user becomes a later addition rather than a schema migration.
    """
    user = session.scalar(select(User).where(User.username == settings.default_user))
    if user is None:
        user = User(username=settings.default_user)
        session.add(user)
        session.commit()
        session.refresh(user)
    return user
