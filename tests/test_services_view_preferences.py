"""Unit tests for per-user view preferences (BIZ-053) — the JSON bag distinct from Settings."""

from __future__ import annotations

import pytest
from sqlalchemy.orm import Session

from walker.models import User
from walker.services.settings import (
    DEFAULT_VIEW_PREFERENCES,
    get_settings,
    update_view_preferences,
)


@pytest.fixture(autouse=True)
def _seed_user(session: Session) -> None:
    """Seed user 1: ``settings.user_id`` is a foreign key to ``users.id``."""
    session.add(User(id=1, username="user-1"))
    session.commit()


def test_defaults_when_nothing_stored(session: Session) -> None:
    prefs = get_settings(session, 1).view_preferences
    assert prefs == DEFAULT_VIEW_PREFERENCES
    assert prefs["task_view"] == "list"
    assert prefs["done_collapsed"] is False


def test_partial_patch_merges_over_the_rest(session: Session) -> None:
    view = update_view_preferences(session, 1, {"task_view": "board", "done_collapsed": True})
    assert view.view_preferences["task_view"] == "board"
    assert view.view_preferences["done_collapsed"] is True
    # Untouched keys keep their defaults.
    assert view.view_preferences["task_group"] == "none"
    assert view.view_preferences["task_sort"] == "due"


def test_successive_patches_accumulate(session: Session) -> None:
    update_view_preferences(session, 1, {"task_view": "board"})
    view = update_view_preferences(session, 1, {"task_group": "code"})
    assert view.view_preferences["task_view"] == "board"
    assert view.view_preferences["task_group"] == "code"


def test_invalid_enum_value_falls_back_to_default(session: Session) -> None:
    view = update_view_preferences(session, 1, {"task_view": "bogus"})
    assert view.view_preferences["task_view"] == "list"


def test_task_hide_done_defaults_to_hiding(session: Session) -> None:
    """BIZ-087: the Tasks list starts clear of finished work; the toggle brings it back."""
    assert get_settings(session, 1).view_preferences["task_hide_done"] is True


def test_task_hide_done_can_be_turned_off_and_persists(session: Session) -> None:
    update_view_preferences(session, 1, {"task_hide_done": False})

    assert get_settings(session, 1).view_preferences["task_hide_done"] is False


def test_task_hide_done_rejects_a_non_boolean(session: Session) -> None:
    view = update_view_preferences(session, 1, {"task_hide_done": "yes"})

    assert view.view_preferences["task_hide_done"] is True


def test_unknown_keys_are_ignored(session: Session) -> None:
    view = update_view_preferences(session, 1, {"nonsense": "x", "task_sort": "title"})
    assert "nonsense" not in view.view_preferences
    assert view.view_preferences["task_sort"] == "title"


def test_non_bool_done_collapsed_is_ignored(session: Session) -> None:
    view = update_view_preferences(session, 1, {"done_collapsed": "yes"})
    assert view.view_preferences["done_collapsed"] is False


def test_enter_rounding_defaults_false_and_round_trips(session: Session) -> None:
    # BIZ-063: the Enter-view quarter-hour rounding toggle, persisted like done_collapsed.
    assert get_settings(session, 1).view_preferences["enter_rounding"] is False
    view = update_view_preferences(session, 1, {"enter_rounding": True})
    assert view.view_preferences["enter_rounding"] is True


def test_non_bool_enter_rounding_is_ignored(session: Session) -> None:
    view = update_view_preferences(session, 1, {"enter_rounding": "yes"})
    assert view.view_preferences["enter_rounding"] is False


def test_likely_count_defaults_to_five(session: Session) -> None:
    """BIZ-084: the band's row cap, previously hardcoded at 5 in BIZ-083."""
    assert get_settings(session, 1).view_preferences["likely_count"] == 5


def test_likely_count_round_trips_and_persists(session: Session) -> None:
    update_view_preferences(session, 1, {"likely_count": 8})

    assert get_settings(session, 1).view_preferences["likely_count"] == 8


def test_likely_count_zero_is_a_valid_value(session: Session) -> None:
    """0 is the off switch, not an invalid value — it must survive rather than fall back to 5."""
    update_view_preferences(session, 1, {"likely_count": 0})

    assert get_settings(session, 1).view_preferences["likely_count"] == 0


@pytest.mark.parametrize("value", [-1, 11, 100])
def test_out_of_range_likely_count_falls_back_to_the_default(session: Session, value: int) -> None:
    view = update_view_preferences(session, 1, {"likely_count": value})

    assert view.view_preferences["likely_count"] == 5


@pytest.mark.parametrize("value", ["5", 5.5, None, [5]])
def test_non_integer_likely_count_falls_back_to_the_default(session: Session, value: object) -> None:
    view = update_view_preferences(session, 1, {"likely_count": value})

    assert view.view_preferences["likely_count"] == 5


def test_boolean_likely_count_is_rejected(session: Session) -> None:
    """``bool`` is an ``int`` subclass in Python — ``True`` must not slip through as 1."""
    view = update_view_preferences(session, 1, {"likely_count": True})

    assert view.view_preferences["likely_count"] == 5
