"""Unit tests for the Settings get-or-create race handling (reported live against BIZ-029 SSO)."""

from __future__ import annotations

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from walker.models import Settings
from walker.models.settings import DEFAULT_PERIOD_SCHEME, DEFAULT_WORKDAYS
from walker.services.settings import get_settings


def test_get_settings_recovers_from_a_concurrent_create_for_the_same_user(session: Session) -> None:
    """Two of the SPA's parallel boot-time requests can both see no row yet for a brand-new user.

    Simulates the loser's INSERT hitting settings.user_id's unique constraint by having the first
    commit attempt roll back, plant the "winner"'s row directly, and raise IntegrityError — exactly
    what the real 500 looked like in production.
    """
    original_commit = session.commit
    raced = {"done": False}

    def racing_commit() -> None:
        if raced["done"]:
            original_commit()
            return
        raced["done"] = True
        session.rollback()
        session.add(
            Settings(
                user_id=42,
                workdays=DEFAULT_WORKDAYS,
                density="comfortable",
                period_scheme=DEFAULT_PERIOD_SCHEME,
            )
        )
        original_commit()
        raise IntegrityError("INSERT INTO settings ...", {}, Exception("UNIQUE constraint failed: settings.user_id"))

    session.commit = racing_commit  # type: ignore[method-assign]

    result = get_settings(session, user_id=42)

    assert result.workdays == [char == "1" for char in DEFAULT_WORKDAYS]
    assert session.query(Settings).filter_by(user_id=42).count() == 1
