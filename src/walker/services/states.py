"""User-defined task states with positional roles (BIZ-056, ADR-0011).

Task states are a per-user, ordered list — each an opaque stable ``id`` plus an editable ``label``.
Behaviour resolves through **position**, not by naming ``todo``/``done``: the **first** state is the
initial role (new-Task default, recurrence reset), the **last** is the terminal role
(Complete / roll-forward), and the state **after the first** is the start-timer nudge target
(BIZ-050).

This module is pure — no DB access — so the rules are unit-testable on their own and can be imported
by ``services/tasks`` and ``services/entries`` without a cycle. Persistence (reading/writing the list
on the user's ``Settings`` row, and reassigning Tasks on delete) lives in ``services/settings``.

The five seeded defaults keep the historical enum values as their ids so the Enum→String migration
needs no status rewrite and Tasks stay unchanged in meaning; newly **added** states get a freshly
generated opaque id, so a re-added state can never collide with or silently re-tag another. Ids are
never derived from the label, so a rename is O(1) and never cascades (ADR-0011).
"""

from __future__ import annotations

import secrets

from walker.exceptions import ValidationError

# Minimum number of states, so the initial and terminal roles are always distinct (ADR-0011).
MIN_STATES = 2

# The five historical defaults, in order. Ids match the old ``TaskStatus`` enum values so the
# migration rewrites no Task statuses.
DEFAULT_TASK_STATES: list[dict[str, str]] = [
    {"id": "todo", "label": "To-do"},
    {"id": "in_progress", "label": "In progress"},
    {"id": "waiting", "label": "Waiting"},
    {"id": "test", "label": "Test"},
    {"id": "done", "label": "Done"},
]


def _new_id() -> str:
    """A fresh opaque state id (not derived from the label — see module docstring)."""
    return secrets.token_hex(4)


def _clean(stored: object) -> list[dict[str, str]]:
    """Keep only well-formed ``{"id", "label"}`` entries from a stored value, preserving order."""
    if not isinstance(stored, list):
        return []
    cleaned: list[dict[str, str]] = []
    seen: set[str] = set()
    for entry in stored:
        if not isinstance(entry, dict):
            continue
        state_id = entry.get("id")
        label = entry.get("label")
        if isinstance(state_id, str) and state_id and state_id not in seen and isinstance(label, str) and label:
            cleaned.append({"id": state_id, "label": label})
            seen.add(state_id)
    return cleaned


def resolve_states(stored: object) -> list[dict[str, str]]:
    """Return the user's states, falling back to the defaults when the stored value is unusable."""
    cleaned = _clean(stored)
    if len(cleaned) < MIN_STATES:
        return [dict(state) for state in DEFAULT_TASK_STATES]
    return cleaned


def state_ids(states: list[dict[str, str]]) -> set[str]:
    """The set of state ids, for membership checks."""
    return {state["id"] for state in states}


def initial_id(states: list[dict[str, str]]) -> str:
    """The initial role: the first state (new-Task default, recurrence reset)."""
    return states[0]["id"]


def terminal_id(states: list[dict[str, str]]) -> str:
    """The terminal role: the last state (Complete / recurrence roll-forward trigger)."""
    return states[-1]["id"]


def nudge_id(states: list[dict[str, str]]) -> str:
    """The start-timer nudge target (BIZ-050): the state after the first."""
    return states[1]["id"]


def _index_of(states: list[dict[str, str]], state_id: str) -> int:
    for index, state in enumerate(states):
        if state["id"] == state_id:
            return index
    raise ValidationError(f"Unknown state: {state_id!r}.")


def add_state(states: list[dict[str, str]], label: str) -> list[dict[str, str]]:
    """Return a new list with a state inserted **before the terminal** (so it can't hijack the last
    role); the caller can move it last afterwards. Assigns a fresh opaque id.
    """
    clean_label = label.strip()
    if not clean_label:
        raise ValidationError("A state label cannot be empty.")
    new = [dict(state) for state in states]
    new.insert(max(len(new) - 1, 0), {"id": _new_id(), "label": clean_label})
    return new


def rename_state(states: list[dict[str, str]], state_id: str, label: str) -> list[dict[str, str]]:
    """Return a new list with ``state_id``'s label changed (id untouched — Tasks are never re-tagged)."""
    clean_label = label.strip()
    if not clean_label:
        raise ValidationError("A state label cannot be empty.")
    index = _index_of(states, state_id)
    new = [dict(state) for state in states]
    new[index]["label"] = clean_label
    return new


def reorder_states(states: list[dict[str, str]], ordered_ids: list[str]) -> list[dict[str, str]]:
    """Return the states reordered to match ``ordered_ids``, which must be a permutation of the ids."""
    if state_ids(states) != set(ordered_ids) or len(ordered_ids) != len(states):
        raise ValidationError("The new order must list every existing state exactly once.")
    by_id = {state["id"]: dict(state) for state in states}
    return [by_id[state_id] for state_id in ordered_ids]


def delete_state(states: list[dict[str, str]], state_id: str) -> list[dict[str, str]]:
    """Return a new list without ``state_id``. Refuses to drop below :data:`MIN_STATES`.

    Reassigning the deleted state's Tasks is the caller's job (it needs the DB); this only enforces
    the id exists and the minimum is kept.
    """
    _index_of(states, state_id)  # existence check
    if len(states) <= MIN_STATES:
        raise ValidationError(f"A minimum of {MIN_STATES} states is required.")
    return [dict(state) for state in states if state["id"] != state_id]
