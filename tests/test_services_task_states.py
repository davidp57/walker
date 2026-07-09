"""Persistence + positional behaviour for user-defined task states (BIZ-056, ADR-0011)."""

from __future__ import annotations

from datetime import date

import pytest
from sqlalchemy.orm import Session

from walker.exceptions import ValidationError
from walker.models import User
from walker.services import entries as entry_service
from walker.services import settings as settings_service
from walker.services import tasks as task_service


def _user(session: Session) -> User:
    user = User(username="me")
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def _ids(view: object) -> list[str]:
    return [s["id"] for s in view.task_states]  # type: ignore[attr-defined]


def test_defaults_exposed_on_first_use(session: Session) -> None:
    user = _user(session)
    assert _ids(settings_service.get_settings(session, user.id)) == [
        "todo",
        "in_progress",
        "waiting",
        "test",
        "done",
    ]


def test_add_inserts_before_the_terminal(session: Session) -> None:
    user = _user(session)
    view = settings_service.add_task_state(session, user.id, "Blocked")
    labels = [s["label"] for s in view.task_states]
    assert labels == ["To-do", "In progress", "Waiting", "Test", "Blocked", "Done"]


def test_rename_changes_label_only_and_keeps_task_status(session: Session) -> None:
    user = _user(session)
    task = task_service.create_task(
        session,
        user.id,
        title="T",
        description=None,
        status="todo",
        priority=None,
        due_date=None,
        tags=[],
        timesheet_code_id=None,
    )
    settings_service.rename_task_state(session, user.id, "todo", "Backlog")
    session.refresh(task)
    assert task.status == "todo"  # id untouched
    view = settings_service.get_settings(session, user.id)
    assert view.task_states[0] == {"id": "todo", "label": "Backlog"}


def test_delete_empty_state_outright(session: Session) -> None:
    user = _user(session)
    view = settings_service.delete_task_state(session, user.id, "waiting")
    assert "waiting" not in _ids(view)


def test_delete_non_empty_requires_valid_reassignment(session: Session) -> None:
    user = _user(session)
    task = task_service.create_task(
        session,
        user.id,
        title="T",
        description=None,
        status="waiting",
        priority=None,
        due_date=None,
        tags=[],
        timesheet_code_id=None,
    )
    with pytest.raises(ValidationError):
        settings_service.delete_task_state(session, user.id, "waiting")  # no target for its task

    settings_service.delete_task_state(session, user.id, "waiting", reassign_to="todo")
    session.refresh(task)
    assert task.status == "todo"


def test_delete_blocked_at_two_states(session: Session) -> None:
    user = _user(session)
    for state_id in ("in_progress", "waiting", "test"):
        settings_service.delete_task_state(session, user.id, state_id)
    # Now only [todo, done] remain.
    with pytest.raises(ValidationError):
        settings_service.delete_task_state(session, user.id, "todo")


def test_validate_status_rejects_unknown_id(session: Session) -> None:
    user = _user(session)
    with pytest.raises(ValidationError):
        task_service.create_task(
            session,
            user.id,
            title="T",
            description=None,
            status="nope",
            priority=None,
            due_date=None,
            tags=[],
            timesheet_code_id=None,
        )


def test_behaviour_resolves_by_position_on_a_reordered_list(session: Session) -> None:
    """New-default, Complete, recurrence reset and the nudge all follow position, not names."""
    user = _user(session)
    # Reverse the list: "done" is now first (initial), "todo" is last (terminal).
    settings_service.reorder_task_states(session, user.id, ["done", "test", "waiting", "in_progress", "todo"])

    # New Task with no status → the first (initial) state = "done".
    task = task_service.create_task(
        session,
        user.id,
        title="T",
        description=None,
        status=None,
        priority=None,
        due_date=None,
        tags=[],
        timesheet_code_id=None,
    )
    assert task.status == "done"

    # Starting a timer on a Task in the initial state nudges it to the second = "test".
    entry_service.switch_timer(session, user.id, date(2026, 7, 9), 600, task_id=task.id)
    session.refresh(task)
    assert task.status == "test"

    # Complete a plain Task → the last (terminal) state = "todo".
    completed = task_service.complete_task(session, user.id, task.id)
    assert completed.status == "todo"


def test_recurring_task_resets_to_initial_on_complete(session: Session) -> None:
    user = _user(session)
    settings_service.reorder_task_states(session, user.id, ["done", "test", "waiting", "in_progress", "todo"])
    task = task_service.create_task(
        session,
        user.id,
        title="Standup",
        description=None,
        status="in_progress",
        priority=None,
        due_date=date(2026, 7, 9),
        tags=[],
        timesheet_code_id=None,
        recurrence_rule={"kind": "every_n_days", "n": 1},
    )
    completed = task_service.complete_task(session, user.id, task.id)
    assert completed.status == "done"  # initial after the reorder, not literal "todo"
    assert completed.due_date is not None and completed.due_date > date(2026, 7, 9)
