"""Pure task-state rules: positional roles + list operations (BIZ-056, ADR-0011)."""

from __future__ import annotations

import pytest

from walker.exceptions import ValidationError
from walker.services import states


def _states() -> list[dict[str, str]]:
    return [
        {"id": "a", "label": "Alpha"},
        {"id": "b", "label": "Beta"},
        {"id": "c", "label": "Gamma"},
    ]


def test_defaults_are_the_five_historical_states_in_order() -> None:
    ids = [s["id"] for s in states.DEFAULT_TASK_STATES]
    assert ids == ["todo", "in_progress", "waiting", "test", "done"]


def test_resolve_falls_back_to_defaults_when_unusable() -> None:
    assert states.resolve_states(None) == states.DEFAULT_TASK_STATES
    assert states.resolve_states([]) == states.DEFAULT_TASK_STATES
    assert states.resolve_states([{"id": "only", "label": "One"}]) == states.DEFAULT_TASK_STATES
    assert states.resolve_states("garbage") == states.DEFAULT_TASK_STATES


def test_resolve_keeps_a_valid_custom_list_and_drops_malformed_entries() -> None:
    stored = [
        {"id": "a", "label": "Alpha"},
        {"id": "", "label": "empty id"},
        {"id": "b"},  # missing label
        {"id": "c", "label": "Gamma"},
        {"id": "a", "label": "dup id"},  # duplicate id dropped
    ]
    assert states.resolve_states(stored) == [
        {"id": "a", "label": "Alpha"},
        {"id": "c", "label": "Gamma"},
    ]


def test_positional_roles() -> None:
    s = _states()
    assert states.initial_id(s) == "a"
    assert states.terminal_id(s) == "c"
    assert states.nudge_id(s) == "b"


def test_add_inserts_before_the_terminal_with_a_fresh_opaque_id() -> None:
    s = _states()
    result = states.add_state(s, "  New  ")
    assert [x["label"] for x in result] == ["Alpha", "Beta", "New", "Gamma"]
    new_id = result[2]["id"]
    assert new_id not in states.state_ids(s)  # opaque, freshly generated
    assert states.terminal_id(result) == "c"  # terminal role unchanged


def test_add_rejects_an_empty_label() -> None:
    with pytest.raises(ValidationError):
        states.add_state(_states(), "   ")


def test_rename_changes_only_the_label_keeping_the_id() -> None:
    result = states.rename_state(_states(), "b", "Renamed")
    assert result[1] == {"id": "b", "label": "Renamed"}


def test_rename_unknown_id_raises() -> None:
    with pytest.raises(ValidationError):
        states.rename_state(_states(), "zzz", "X")


def test_reorder_is_a_permutation() -> None:
    result = states.reorder_states(_states(), ["c", "a", "b"])
    assert [x["id"] for x in result] == ["c", "a", "b"]


def test_reorder_rejects_a_non_permutation() -> None:
    with pytest.raises(ValidationError):
        states.reorder_states(_states(), ["a", "b"])  # missing c
    with pytest.raises(ValidationError):
        states.reorder_states(_states(), ["a", "b", "zzz"])  # unknown id


def test_delete_removes_a_state() -> None:
    result = states.delete_state(_states(), "b")
    assert [x["id"] for x in result] == ["a", "c"]


def test_delete_refused_at_minimum() -> None:
    two = [{"id": "a", "label": "A"}, {"id": "b", "label": "B"}]
    with pytest.raises(ValidationError):
        states.delete_state(two, "a")


def test_delete_unknown_id_raises() -> None:
    with pytest.raises(ValidationError):
        states.delete_state(_states(), "zzz")
