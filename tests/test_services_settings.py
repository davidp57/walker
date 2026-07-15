"""Unit tests for the Settings get-or-create race handling (reported live against BIZ-029 SSO) and
the ``theme`` preference (BIZ-031).
"""

from __future__ import annotations

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from walker.models import Settings, User
from walker.models.settings import DEFAULT_PERIOD_SCHEME, DEFAULT_WORKDAYS
from walker.services.settings import get_settings, resolve_theme, update_settings


@pytest.fixture(autouse=True)
def _seed_users(session: Session) -> None:
    """Seed the users these tests reference: ``settings.user_id`` is a foreign key to ``users.id``."""
    session.add_all([User(id=7, username="user-7"), User(id=42, username="user-42")])
    session.commit()


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


def test_get_settings_defaults_theme_to_system(session: Session) -> None:
    result = get_settings(session, user_id=7)

    assert result.theme == "system"


def test_update_settings_persists_theme(session: Session) -> None:
    update_settings(session, user_id=7, workdays=[True] * 7, density="comfortable", theme="dark")

    assert get_settings(session, user_id=7).theme == "dark"


def test_update_settings_without_theme_keeps_existing_value(session: Session) -> None:
    update_settings(session, user_id=7, workdays=[True] * 7, density="comfortable", theme="light")

    result = update_settings(session, user_id=7, workdays=[True] * 7, density="comfortable")

    assert result.theme == "light"


@pytest.mark.parametrize(
    ("preference", "prefers_dark", "expected"),
    [
        ("system", True, "dark"),
        ("system", False, "light"),
        ("dark", True, "dark"),
        ("dark", False, "dark"),
        ("light", True, "light"),
        ("light", False, "light"),
    ],
)
def test_resolve_theme_truth_table(preference: str, prefers_dark: bool, expected: str) -> None:
    assert resolve_theme(preference, prefers_dark) == expected  # type: ignore[arg-type]
