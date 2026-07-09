"""Tests for the task-state CRUD endpoints (BIZ-056, ADR-0011)."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_settings_exposes_default_states(client: TestClient) -> None:
    states = client.get("/api/settings").json()["task_states"]
    assert [s["label"] for s in states] == ["To-do", "In progress", "Waiting", "Test", "Done"]


def test_add_state_inserts_before_terminal(client: TestClient) -> None:
    body = client.post("/api/task-states", json={"label": "Blocked"})
    assert body.status_code == 201
    labels = [s["label"] for s in body.json()["task_states"]]
    assert labels == ["To-do", "In progress", "Waiting", "Test", "Blocked", "Done"]


def test_rename_state_changes_label_only(client: TestClient) -> None:
    body = client.patch("/api/task-states/todo", json={"label": "Backlog"})
    assert body.status_code == 200
    states = {s["id"]: s["label"] for s in body.json()["task_states"]}
    assert states["todo"] == "Backlog"


def test_reorder_states(client: TestClient) -> None:
    order = ["done", "test", "waiting", "in_progress", "todo"]
    body = client.put("/api/task-states/order", json={"ordered_ids": order})
    assert body.status_code == 200
    assert _ids_from(body) == order


def test_reorder_rejects_non_permutation(client: TestClient) -> None:
    body = client.put("/api/task-states/order", json={"ordered_ids": ["todo", "done"]})
    assert body.status_code == 422


def test_delete_empty_state(client: TestClient) -> None:
    body = client.request("DELETE", "/api/task-states/waiting")
    assert body.status_code == 200
    assert "waiting" not in [s["id"] for s in body.json()["task_states"]]


def test_delete_non_empty_state_requires_reassign(client: TestClient) -> None:
    client.post("/api/tasks", json={"title": "Waiting task", "status": "waiting"})

    refused = client.request("DELETE", "/api/task-states/waiting")
    assert refused.status_code == 422

    ok = client.request("DELETE", "/api/task-states/waiting?reassign_to=todo")
    assert ok.status_code == 200
    assert "waiting" not in [s["id"] for s in ok.json()["task_states"]]


def test_delete_unknown_state_is_422(client: TestClient) -> None:
    assert client.request("DELETE", "/api/task-states/nope").status_code == 422


def _ids_from(response: object) -> list[str]:
    return [s["id"] for s in response.json()["task_states"]]  # type: ignore[attr-defined]
