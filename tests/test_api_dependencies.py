"""Unit tests for the implicit-default-user get-or-create race (reported live from the standalone .exe)."""

from __future__ import annotations

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from walker.api.dependencies import _get_implicit_default_user
from walker.config import settings
from walker.models import User


def test_implicit_default_user_recovers_from_a_concurrent_create(session: Session) -> None:
    """On a brand-new database, the SPA's parallel boot requests can all race to create "me".

    Simulates the loser's INSERT hitting username's unique constraint by having the first commit
    attempt roll back, plant the "winner"'s row directly, and raise IntegrityError — exactly what
    the real 500 looked like when a fresh standalone .exe database was opened for the first time.
    """
    original_commit = session.commit
    raced = {"done": False}

    def racing_commit() -> None:
        if raced["done"]:
            original_commit()
            return
        raced["done"] = True
        session.rollback()
        session.add(User(username=settings.default_user))
        original_commit()
        raise IntegrityError("INSERT INTO users ...", {}, Exception("UNIQUE constraint failed: users.username"))

    session.commit = racing_commit  # type: ignore[method-assign]

    user = _get_implicit_default_user(session)

    assert user.username == settings.default_user
    assert session.query(User).filter_by(username=settings.default_user).count() == 1
