"""Tests for the Task CRUD + tag-autocomplete endpoints (BIZ-021)."""

from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from walker.config import settings
from walker.models import Task, TimesheetCode, User


def _seed_user(session: Session, username: str) -> User:
    user = User(username=username)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def _seed_code(session: Session, user_id: int, real_code_id: int | None = None) -> TimesheetCode:
    code = TimesheetCode(
        user_id=user_id,
        number="N9/1042",
        label="MNT - PAP V4",
        name="Paper V4",
        color="#3b82f6",
        real_code_id=real_code_id,
    )
    session.add(code)
    session.commit()
    session.refresh(code)
    return code


def test_create_task_with_only_a_title(client: TestClient) -> None:
    response = client.post("/api/tasks", json={"title": "Renew passport"})

    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Renew passport"
    assert body["description"] is None
    assert body["status"] == "todo"
    assert body["priority"] is None
    assert body["due_date"] is None
    assert body["tags"] == []
    assert body["timesheet_code_id"] is None
    assert "id" in body
    assert "created_at" in body
    assert "updated_at" in body


def test_create_task_with_all_fields(client: TestClient, session: Session) -> None:
    user = _seed_user(session, settings.default_user)
    code = _seed_code(session, user.id)

    response = client.post(
        "/api/tasks",
        json={
            "title": "Fix bug in report generator",
            "description": "Some *markdown* notes.",
            "status": "in_progress",
            "priority": "high",
            "due_date": "2026-07-15",
            "tags": ["urgent", "backend"],
            "timesheet_code_id": code.id,
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["description"] == "Some *markdown* notes."
    assert body["status"] == "in_progress"
    assert body["priority"] == "high"
    assert body["due_date"] == "2026-07-15"
    assert body["tags"] == ["urgent", "backend"]
    assert body["timesheet_code_id"] == code.id


def test_create_task_accepts_a_virtual_code(client: TestClient, session: Session) -> None:
    user = _seed_user(session, settings.default_user)
    real = _seed_code(session, user.id)
    virtual = TimesheetCode(
        user_id=user.id,
        number=real.number,
        label=real.label,
        name="Project A",
        color="#abcdef",
        real_code_id=real.id,
    )
    session.add(virtual)
    session.commit()
    session.refresh(virtual)

    response = client.post("/api/tasks", json={"title": "Task on virtual code", "timesheet_code_id": virtual.id})

    assert response.status_code == 201
    assert response.json()["timesheet_code_id"] == virtual.id


def test_create_task_rejects_unknown_code(client: TestClient) -> None:
    response = client.post("/api/tasks", json={"title": "Orphan-ish", "timesheet_code_id": 999})

    assert response.status_code == 404


def test_create_task_rejects_unknown_status(client: TestClient) -> None:
    response = client.post("/api/tasks", json={"title": "Bad status", "status": "bogus"})

    assert response.status_code == 422


def test_create_task_rejects_unknown_priority(client: TestClient) -> None:
    response = client.post("/api/tasks", json={"title": "Bad priority", "priority": "urgent-ish"})

    assert response.status_code == 422


def test_list_tasks_returns_users_tasks_most_recently_updated_first(client: TestClient) -> None:
    client.post("/api/tasks", json={"title": "First"})
    client.post("/api/tasks", json={"title": "Second"})

    body = client.get("/api/tasks").json()

    assert [t["title"] for t in body] == ["Second", "First"]


def test_list_tasks_is_scoped_to_current_user(client: TestClient, session: Session) -> None:
    me = _seed_user(session, settings.default_user)
    other = _seed_user(session, "someone-else")
    session.add_all(
        [
            Task(user_id=other.id, title="Not mine"),
            Task(user_id=me.id, title="Mine"),
        ]
    )
    session.commit()

    body = client.get("/api/tasks").json()

    assert [t["title"] for t in body] == ["Mine"]


def test_update_task_replaces_all_fields(client: TestClient) -> None:
    created = client.post("/api/tasks", json={"title": "Draft"}).json()

    response = client.put(
        f"/api/tasks/{created['id']}",
        json={
            "title": "Final title",
            "description": "Updated notes",
            "status": "waiting",
            "priority": "medium",
            "due_date": "2026-08-01",
            "tags": ["a", "b"],
            "timesheet_code_id": None,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Final title"
    assert body["description"] == "Updated notes"
    assert body["status"] == "waiting"
    assert body["priority"] == "medium"
    assert body["due_date"] == "2026-08-01"
    assert body["tags"] == ["a", "b"]


def test_update_task_can_clear_optional_fields(client: TestClient, session: Session) -> None:
    user = _seed_user(session, settings.default_user)
    code = _seed_code(session, user.id)
    created = client.post(
        "/api/tasks",
        json={
            "title": "Has stuff",
            "priority": "high",
            "due_date": "2026-07-10",
            "tags": ["x"],
            "timesheet_code_id": code.id,
        },
    ).json()

    response = client.put(
        f"/api/tasks/{created['id']}",
        json={"title": "Has stuff", "priority": None, "due_date": None, "tags": [], "timesheet_code_id": None},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["priority"] is None
    assert body["due_date"] is None
    assert body["tags"] == []
    assert body["timesheet_code_id"] is None


def test_update_unknown_task_returns_404(client: TestClient) -> None:
    response = client.put("/api/tasks/999", json={"title": "Nope"})

    assert response.status_code == 404


def test_update_task_rejects_unknown_code(client: TestClient) -> None:
    created = client.post("/api/tasks", json={"title": "Draft"}).json()

    response = client.put(
        f"/api/tasks/{created['id']}",
        json={"title": "Draft", "timesheet_code_id": 999},
    )

    assert response.status_code == 404


def test_delete_task_removes_it(client: TestClient) -> None:
    created = client.post("/api/tasks", json={"title": "To delete"}).json()

    response = client.delete(f"/api/tasks/{created['id']}")

    assert response.status_code == 204
    assert client.get("/api/tasks").json() == []


def test_delete_unknown_task_returns_404(client: TestClient) -> None:
    response = client.delete("/api/tasks/999")

    assert response.status_code == 404


def test_list_task_tags_returns_distinct_sorted_tags(client: TestClient) -> None:
    client.post("/api/tasks", json={"title": "A", "tags": ["urgent", "backend"]})
    client.post("/api/tasks", json={"title": "B", "tags": ["backend", "frontend"]})

    response = client.get("/api/tasks/tags")

    assert response.status_code == 200
    assert response.json() == ["backend", "frontend", "urgent"]


def test_list_task_tags_is_scoped_to_current_user(client: TestClient, session: Session) -> None:
    me = _seed_user(session, settings.default_user)
    other = _seed_user(session, "someone-else")

    session.add_all(
        [
            Task(user_id=other.id, title="Not mine", tags=["secret"]),
            Task(user_id=me.id, title="Mine", tags=["visible"]),
        ]
    )
    session.commit()

    response = client.get("/api/tasks/tags")

    assert response.json() == ["visible"]


def test_list_task_tags_empty_when_no_tasks(client: TestClient) -> None:
    response = client.get("/api/tasks/tags")

    assert response.status_code == 200
    assert response.json() == []


def test_create_task_with_recurrence_rule(client: TestClient) -> None:
    response = client.post(
        "/api/tasks",
        json={"title": "Key in Timesheet system", "recurrence_rule": {"kind": "every_n_days", "n": 14}},
    )

    assert response.status_code == 201
    assert response.json()["recurrence_rule"] == {"kind": "every_n_days", "n": 14}


def test_create_task_rejects_malformed_recurrence_rule(client: TestClient) -> None:
    response = client.post(
        "/api/tasks",
        json={"title": "Bad rule", "recurrence_rule": {"kind": "every_n_days", "n": -1}},
    )

    assert response.status_code == 422


def test_create_task_rejects_unknown_recurrence_kind(client: TestClient) -> None:
    response = client.post(
        "/api/tasks",
        json={"title": "Bad rule", "recurrence_rule": {"kind": "yearly"}},
    )

    assert response.status_code == 422


def test_completing_a_non_recurring_task_marks_it_done(client: TestClient) -> None:
    created = client.post("/api/tasks", json={"title": "One-off"}).json()

    response = client.post(f"/api/tasks/{created['id']}/complete")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "done"
    assert body["due_date"] is None


def test_completing_a_recurring_task_rolls_it_forward_every_n_days(client: TestClient) -> None:
    created = client.post(
        "/api/tasks",
        json={
            "title": "Key in Timesheet system",
            "status": "in_progress",
            "due_date": "2026-07-01",
            "recurrence_rule": {"kind": "every_n_days", "n": 14},
        },
    ).json()

    response = client.post(f"/api/tasks/{created['id']}/complete")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "todo"
    assert body["due_date"] == "2026-07-15"
    # No history: it's the same Task row, just rolled forward.
    assert body["id"] == created["id"]


def test_completing_a_fortnight_relative_task_snaps_to_working_days_via_settings(
    client: TestClient,
) -> None:
    # Mon-Fri work rhythm (Sun-first booleans).
    mon_fri = [False, True, True, True, True, True, False]
    client.put("/api/settings", json={"workdays": mon_fri, "density": "comfortable"})
    # 2026-06-29 (Monday) is an absence, so the last-working-day-before-end snap must skip past it.
    client.post("/api/settings/absences", json={"date": "2026-06-29", "reason": "Leave"})

    created = client.post(
        "/api/tasks",
        json={
            "title": "Key in Timesheet system",
            "due_date": "2026-06-15",
            "recurrence_rule": {"kind": "fortnight_relative", "anchor": "end", "offset_days": -1},
        },
    ).json()

    response = client.post(f"/api/tasks/{created['id']}/complete")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "todo"
    assert body["due_date"] == "2026-06-26"  # last working day before 2026-06-29, itself skipped


def test_complete_unknown_task_returns_404(client: TestClient) -> None:
    response = client.post("/api/tasks/999/complete")

    assert response.status_code == 404
