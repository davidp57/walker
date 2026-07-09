"""Unit tests for per-user view preferences (BIZ-053) — the JSON bag distinct from Settings."""

from __future__ import annotations

from sqlalchemy.orm import Session

from walker.services.settings import (
    DEFAULT_VIEW_PREFERENCES,
    get_settings,
    update_view_preferences,
)


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


def test_unknown_keys_are_ignored(session: Session) -> None:
    view = update_view_preferences(session, 1, {"nonsense": "x", "task_sort": "title"})
    assert "nonsense" not in view.view_preferences
    assert view.view_preferences["task_sort"] == "title"


def test_non_bool_done_collapsed_is_ignored(session: Session) -> None:
    view = update_view_preferences(session, 1, {"done_collapsed": "yes"})
    assert view.view_preferences["done_collapsed"] is False
