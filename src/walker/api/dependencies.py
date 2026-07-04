"""FastAPI dependencies shared across routers."""

from __future__ import annotations

from fastapi import Depends, Request
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from walker.config import settings
from walker.db import get_session
from walker.models import User


def _get_implicit_default_user(session: Session) -> User:
    """Return the implicit POC user, creating it on first use (see ADR-0007).

    There is no authentication in this mode; all data is scoped to this single user so that
    multi-user becomes a later addition rather than a schema migration.

    On a brand-new database, the SPA's several parallel boot-time requests (``/api/user``,
    ``/api/settings``, ``/api/codes``, ...) can all see no User yet and race to create it — the
    losers hit ``username``'s unique constraint. Roll back and re-fetch the winner's row instead
    of letting that surface as a 500 (same fix as ``services/settings.py``'s get-or-create).
    """
    user = session.scalar(select(User).where(User.username == settings.default_user))
    if user is not None:
        return user

    user = User(username=settings.default_user)
    session.add(user)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        user = session.scalar(select(User).where(User.username == settings.default_user))
        if user is None:
            raise
    else:
        session.refresh(user)
    return user


def get_current_user(request: Request, session: Session = Depends(get_session)) -> User:
    """Resolve the current ``User`` for the active deployment mode (see ADR-0010).

    ``auth_mode="none"`` (the default, standalone Docker/``.exe``): the implicit default user,
    exactly as before BIZ-029 — no login, no session. ``auth_mode="sso"`` (hosted deployment):
    the signed-in user from the session cookie set by the OAuth callback; unauthenticated requests
    get a 401.
    """
    if settings.auth_mode == "sso":
        from walker.api.routers.auth import get_current_sso_user

        return get_current_sso_user(request, session)
    return _get_implicit_default_user(session)
