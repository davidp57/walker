"""Tests for the timer + entries endpoints (BIZ-003)."""

from __future__ import annotations

from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from walker.config import settings
from walker.models import Entry, Task, TimesheetCode, User

TODAY = date.today().isoformat()


def _seed_user_with_code(session: Session) -> TimesheetCode:
    user = User(username=settings.default_user)
    session.add(user)
    session.commit()
    session.refresh(user)
    code = TimesheetCode(user_id=user.id, number="N9/1042", label="MNT", name="Paper V4", color="#123456")
    session.add(code)
    session.commit()
    session.refresh(code)
    return code


def test_merge_two_overlapping_entries(client: TestClient) -> None:
    """BIZ-077: two same-activity overlapping entries collapse into one spanning the union."""
    a = client.post(
        "/api/entries", json={"date": TODAY, "start_minute": 540, "end_minute": 620, "activity": "Dev"}
    ).json()
    b = client.post(
        "/api/entries", json={"date": TODAY, "start_minute": 600, "end_minute": 700, "activity": "Dev"}
    ).json()

    resp = client.post(f"/api/entries/{a['id']}/merge", json={"other_entry_id": b["id"]})

    assert resp.status_code == 200
    merged = resp.json()
    assert (merged["start_minute"], merged["end_minute"]) == (540, 700)
    listed = client.get("/api/entries", params={"date": TODAY}).json()
    assert [(e["start_minute"], e["end_minute"]) for e in listed] == [(540, 700)]


def test_merge_rejects_different_activity_with_422(client: TestClient) -> None:
    a = client.post(
        "/api/entries", json={"date": TODAY, "start_minute": 540, "end_minute": 620, "activity": "Dev"}
    ).json()
    b = client.post(
        "/api/entries", json={"date": TODAY, "start_minute": 600, "end_minute": 700, "activity": "Review"}
    ).json()

    resp = client.post(f"/api/entries/{a['id']}/merge", json={"other_entry_id": b["id"]})

    assert resp.status_code == 422


def test_insert_break_splits_a_completed_entry(client: TestClient) -> None:
    """BIZ-076: punching a hole returns the two worked segments; the hole is left untracked."""
    created = client.post(
        "/api/entries",
        json={"date": TODAY, "start_minute": 540, "end_minute": 780, "activity": "Dev"},
    ).json()

    resp = client.post(
        f"/api/entries/{created['id']}/break",
        json={"break_start_minute": 720, "break_end_minute": 740},
    )

    assert resp.status_code == 200
    spans = [(e["start_minute"], e["end_minute"]) for e in resp.json()]
    assert spans == [(540, 720), (740, 780)]
    listed = [(e["start_minute"], e["end_minute"]) for e in client.get("/api/entries", params={"date": TODAY}).json()]
    assert listed == [(540, 720), (740, 780)]


def test_insert_break_with_categorized_hole_fills_the_gap(client: TestClient) -> None:
    created = client.post(
        "/api/entries",
        json={"date": TODAY, "start_minute": 540, "end_minute": 780, "activity": "Dev"},
    ).json()

    resp = client.post(
        f"/api/entries/{created['id']}/break",
        json={"break_start_minute": 720, "break_end_minute": 740, "activity": "Lunch"},
    )

    assert resp.status_code == 200
    spans = [(e["start_minute"], e["end_minute"], e["activity"]) for e in resp.json()]
    assert spans == [(540, 720, "Dev"), (720, 740, "Lunch"), (740, 780, "Dev")]


def test_insert_break_out_of_range_is_422(client: TestClient) -> None:
    created = client.post(
        "/api/entries",
        json={"date": TODAY, "start_minute": 540, "end_minute": 780},
    ).json()

    resp = client.post(
        f"/api/entries/{created['id']}/break",
        json={"break_start_minute": 500, "break_end_minute": 560},
    )

    assert resp.status_code == 422


def test_start_creates_a_running_uncategorized_entry(client: TestClient) -> None:
    response = client.post("/api/timer/start")

    assert response.status_code == 201
    entry = response.json()
    assert entry["end_minute"] is None
    assert entry["timesheet_code_id"] is None
    assert entry["activity"] is None
    assert entry["date"] == TODAY


def test_start_marks_the_entry_as_timer_sourced(client: TestClient) -> None:
    # BIZ-065: a timer-started entry records source="timer".
    assert client.post("/api/timer/start").json()["source"] == "timer"


def test_manual_add_marks_the_entry_as_manual_sourced(client: TestClient) -> None:
    # BIZ-065: a "+ Add entry" (direct create) records source="manual".
    response = client.post(
        "/api/entries",
        json={"date": TODAY, "start_minute": 540, "end_minute": 600},
    )
    assert response.status_code == 201
    assert response.json()["source"] == "manual"


def test_second_start_is_rejected_while_one_is_running(client: TestClient) -> None:
    client.post("/api/timer/start")

    response = client.post("/api/timer/start")

    assert response.status_code == 409


def test_switch_closes_the_running_entry_and_opens_a_new_one(client: TestClient) -> None:
    client.post("/api/timer/start")

    response = client.post("/api/timer/switch", json={"description": "next task"})

    assert response.status_code == 201
    new_entry = response.json()
    assert new_entry["end_minute"] is None
    assert new_entry["description"] == "next task"

    entries = client.get("/api/entries", params={"date": TODAY}).json()
    running = [e for e in entries if e["end_minute"] is None]
    closed = [e for e in entries if e["end_minute"] is not None]
    assert len(running) == 1
    assert len(closed) == 1


def test_stop_closes_the_running_entry(client: TestClient) -> None:
    client.post("/api/timer/start")

    response = client.post("/api/timer/stop")

    assert response.status_code == 200
    assert response.json()["end_minute"] is not None
    assert client.get("/api/entries", params={"date": TODAY}).json()[0]["end_minute"] is not None


def test_stop_without_a_running_entry_is_rejected(client: TestClient) -> None:
    response = client.post("/api/timer/stop")

    assert response.status_code == 409


def test_patch_edits_any_field(client: TestClient, session: Session) -> None:
    code = _seed_user_with_code(session)
    entry_id = client.post("/api/timer/start").json()["id"]

    response = client.patch(
        f"/api/entries/{entry_id}",
        json={
            "start_minute": 540,
            "end_minute": 600,
            "timesheet_code_id": code.id,
            "activity": "Bug fixing",
            "description": "Fixed CSV import",
        },
    )

    assert response.status_code == 200
    entry = response.json()
    assert entry["start_minute"] == 540
    assert entry["end_minute"] == 600
    assert entry["timesheet_code_id"] == code.id
    assert entry["activity"] == "Bug fixing"
    assert entry["description"] == "Fixed CSV import"


def test_delete_removes_the_entry(client: TestClient) -> None:
    entry_id = client.post("/api/timer/start").json()["id"]

    response = client.delete(f"/api/entries/{entry_id}")

    assert response.status_code == 204
    assert client.get("/api/entries", params={"date": TODAY}).json() == []


def test_create_entry_without_timer(client: TestClient, session: Session) -> None:
    code = _seed_user_with_code(session)

    response = client.post(
        "/api/entries",
        json={
            "date": "2026-06-20",
            "start_minute": 540,
            "end_minute": 600,
            "timesheet_code_id": code.id,
            "activity": "Bug fixing",
            "description": "Past work",
        },
    )

    assert response.status_code == 201
    entry = response.json()
    assert entry["date"] == "2026-06-20"
    assert entry["start_minute"] == 540
    assert entry["end_minute"] == 600
    assert entry["timesheet_code_id"] == code.id
    assert len(client.get("/api/entries", params={"date": "2026-06-20"}).json()) == 1


def test_create_entry_defaults_to_a_completed_entry(client: TestClient) -> None:
    response = client.post("/api/entries", json={})

    assert response.status_code == 201
    entry = response.json()
    assert entry["end_minute"] is not None  # a real (non-running) entry, not a timer


def test_list_entries_by_date_range(client: TestClient, session: Session) -> None:
    user = User(username=settings.default_user)
    session.add(user)
    session.commit()
    session.refresh(user)
    session.add_all(
        [
            Entry(user_id=user.id, date=date(2026, 7, 3), start_minute=600, end_minute=660),
            Entry(user_id=user.id, date=date(2026, 7, 1), start_minute=540, end_minute=600),
            Entry(user_id=user.id, date=date(2026, 7, 10), start_minute=540, end_minute=600),
        ]
    )
    session.commit()

    body = client.get("/api/entries", params={"from": "2026-07-01", "to": "2026-07-05"}).json()

    assert [e["date"] for e in body] == ["2026-07-01", "2026-07-03"]


def test_patch_can_move_entry_to_another_date(client: TestClient) -> None:
    entry_id = client.post("/api/timer/start").json()["id"]

    response = client.patch(f"/api/entries/{entry_id}", json={"date": "2026-06-15"})

    assert response.status_code == 200
    assert response.json()["date"] == "2026-06-15"


def test_entry_can_be_tracked_and_round_trips_on_a_virtual_code(client: TestClient) -> None:
    """An Entry is a plain FK to timesheet_codes.id — tracking a virtual code needs no schema change
    (ADR-0008): it should categorize and read back exactly like a real code (BIZ-013)."""
    real = client.post(
        "/api/codes",
        json={
            "number": "N9/1042",
            "label": "MNT - PAP V4",
            "name": "Paper V4",
            "activities": [{"code": "0001", "label": "Bug fixing"}],
        },
    ).json()
    virtual = client.post(
        "/api/codes/virtual",
        json={"real_code_id": real["id"], "name": "Workday contact info", "color": "#abcdef"},
    ).json()
    entry_id = client.post("/api/timer/start").json()["id"]

    response = client.patch(
        f"/api/entries/{entry_id}",
        json={"timesheet_code_id": virtual["id"], "activity": "Bug fixing", "description": "Filled contact info"},
    )

    assert response.status_code == 200
    assert response.json()["timesheet_code_id"] == virtual["id"]

    entries = client.get("/api/entries", params={"date": TODAY}).json()
    assert entries[0]["timesheet_code_id"] == virtual["id"]
    assert entries[0]["activity"] == "Bug fixing"
    assert entries[0]["description"] == "Filled contact info"


def test_entries_are_scoped_to_the_current_user(client: TestClient, session: Session) -> None:
    other = User(username="someone-else")
    session.add(other)
    session.commit()
    session.refresh(other)
    session.add(Entry(user_id=other.id, date=date.today(), start_minute=60, end_minute=120))
    session.commit()

    assert client.get("/api/entries", params={"date": TODAY}).json() == []


# ---- Task integration (BIZ-023) ----


def _seed_task(session: Session, status: str = "todo") -> Task:
    user = User(username=settings.default_user)
    session.add(user)
    session.commit()
    session.refresh(user)
    task = Task(user_id=user.id, title="Renew passport", status=status)
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


def test_switch_can_carry_a_task(client: TestClient, session: Session) -> None:
    task = _seed_task(session)

    response = client.post("/api/timer/switch", json={"task_id": task.id, "description": task.title})

    assert response.status_code == 201
    assert response.json()["task_id"] == task.id


def test_patch_can_set_the_entry_s_task(client: TestClient, session: Session) -> None:
    task = _seed_task(session)
    entry_id = client.post("/api/timer/start").json()["id"]

    response = client.patch(f"/api/entries/{entry_id}", json={"task_id": task.id})

    assert response.status_code == 200
    assert response.json()["task_id"] == task.id


def test_create_entry_can_carry_a_task(client: TestClient, session: Session) -> None:
    task = _seed_task(session)

    response = client.post("/api/entries", json={"task_id": task.id})

    assert response.status_code == 201
    assert response.json()["task_id"] == task.id


def test_starting_a_timer_on_a_todo_task_moves_it_to_in_progress(client: TestClient, session: Session) -> None:
    task = _seed_task(session, status="todo")

    client.post("/api/timer/switch", json={"task_id": task.id, "description": task.title})

    body = client.get("/api/tasks").json()
    assert body[0]["status"] == "in_progress"


def test_starting_a_timer_on_a_non_todo_task_leaves_its_status_unchanged(client: TestClient, session: Session) -> None:
    task = _seed_task(session, status="waiting")

    client.post("/api/timer/switch", json={"task_id": task.id, "description": task.title})

    body = client.get("/api/tasks").json()
    assert body[0]["status"] == "waiting"


def test_complete_stops_the_timer_and_marks_the_task_done(client: TestClient, session: Session) -> None:
    task = _seed_task(session, status="in_progress")
    client.post("/api/timer/switch", json={"task_id": task.id, "description": task.title})

    response = client.post("/api/timer/complete")

    assert response.status_code == 200
    entry = response.json()
    assert entry["end_minute"] is not None
    assert entry["task_id"] == task.id
    task_body = client.get("/api/tasks").json()[0]
    assert task_body["status"] == "done"


def test_complete_without_a_running_entry_is_rejected(client: TestClient) -> None:
    response = client.post("/api/timer/complete")

    assert response.status_code == 409


def test_complete_without_a_linked_task_just_stops(client: TestClient) -> None:
    client.post("/api/timer/start")

    response = client.post("/api/timer/complete")

    assert response.status_code == 200
    assert response.json()["end_minute"] is not None


def test_stop_leaves_the_linked_task_s_status_unchanged(client: TestClient, session: Session) -> None:
    task = _seed_task(session, status="in_progress")
    client.post("/api/timer/switch", json={"task_id": task.id, "description": task.title})

    response = client.post("/api/timer/stop")

    assert response.status_code == 200
    task_body = client.get("/api/tasks").json()[0]
    assert task_body["status"] == "in_progress"
