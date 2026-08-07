"""Endpoints for resolving the Entries that block a code deletion (BIZ-088)."""

from __future__ import annotations

from fastapi.testclient import TestClient


def _make_code(client: TestClient, name: str, number: str) -> int:
    response = client.post(
        "/api/codes",
        json={
            "number": number,
            "label": f"MNT - {name}",
            "name": name,
            "activities": [{"code": "0001", "label": "Bug fixing"}],
        },
    )
    assert response.status_code == 201
    return int(response.json()["id"])


def _make_entry(client: TestClient, code_id: int, day: str, start: int, end: int) -> int:
    response = client.post(
        "/api/entries",
        json={
            "date": day,
            "start_minute": start,
            "end_minute": end,
            "timesheet_code_id": code_id,
            "activity": "Bug fixing",
        },
    )
    assert response.status_code == 201
    return int(response.json()["id"])


def test_blocking_entries_is_empty_for_an_unused_code(client: TestClient) -> None:
    code_id = _make_code(client, "Paper", "N9/1042")

    body = client.get(f"/api/codes/{code_id}/blocking-entries").json()

    assert body["total"] == 0
    assert body["own"] == 0
    assert body["others"] == 0
    assert body["entries"] == []


def test_blocking_entries_reports_count_range_minutes_and_rows(client: TestClient) -> None:
    code_id = _make_code(client, "Paper", "N9/1042")
    _make_entry(client, code_id, "2026-07-03", 540, 600)
    _make_entry(client, code_id, "2026-07-10", 540, 630)

    body = client.get(f"/api/codes/{code_id}/blocking-entries").json()

    assert body["total"] == 2
    assert body["own"] == 2
    assert body["first_date"] == "2026-07-03"
    assert body["last_date"] == "2026-07-10"
    assert body["minutes"] == 150
    assert len(body["entries"]) == 2


def test_blocking_entries_404s_for_an_unknown_code(client: TestClient) -> None:
    assert client.get("/api/codes/999/blocking-entries").status_code == 404


def test_delete_conflict_explains_the_block(client: TestClient) -> None:
    """The 409 must carry the count, not the old bare 'referenced by entries'."""
    code_id = _make_code(client, "Paper", "N9/1042")
    _make_entry(client, code_id, "2026-07-03", 540, 600)

    response = client.delete(f"/api/codes/{code_id}")

    assert response.status_code == 409
    assert "1 entry" in response.json()["detail"]
    assert "2026-07-03" in response.json()["detail"]


def test_reassign_then_delete_succeeds(client: TestClient) -> None:
    code_id = _make_code(client, "Paper", "N9/1042")
    target_id = _make_code(client, "Other", "N9/2000")
    entry_id = _make_entry(client, code_id, "2026-07-03", 540, 600)

    response = client.post(
        f"/api/codes/{code_id}/blocking-entries/reassign",
        json={"target_code_id": target_id, "activity": "Support"},
    )

    assert response.status_code == 200
    assert response.json()["total"] == 0
    moved = next(e for e in client.get("/api/entries?from=2026-07-01&to=2026-07-31").json() if e["id"] == entry_id)
    assert moved["timesheet_code_id"] == target_id
    assert moved["activity"] == "Support"
    assert client.delete(f"/api/codes/{code_id}").status_code == 204


def test_reassign_rejects_a_blank_activity(client: TestClient) -> None:
    code_id = _make_code(client, "Paper", "N9/1042")
    target_id = _make_code(client, "Other", "N9/2000")
    _make_entry(client, code_id, "2026-07-03", 540, 600)

    response = client.post(
        f"/api/codes/{code_id}/blocking-entries/reassign",
        json={"target_code_id": target_id, "activity": ""},
    )

    assert response.status_code == 422


def test_reassign_rejects_the_code_being_deleted_as_target(client: TestClient) -> None:
    code_id = _make_code(client, "Paper", "N9/1042")
    _make_entry(client, code_id, "2026-07-03", 540, 600)

    response = client.post(
        f"/api/codes/{code_id}/blocking-entries/reassign",
        json={"target_code_id": code_id, "activity": "Support"},
    )

    assert response.status_code == 422


def test_reassign_404s_on_an_unknown_target(client: TestClient) -> None:
    code_id = _make_code(client, "Paper", "N9/1042")
    _make_entry(client, code_id, "2026-07-03", 540, 600)

    response = client.post(
        f"/api/codes/{code_id}/blocking-entries/reassign",
        json={"target_code_id": 999, "activity": "Support"},
    )

    assert response.status_code == 404


def test_delete_blocking_entries_then_delete_the_code(client: TestClient) -> None:
    code_id = _make_code(client, "Paper", "N9/1042")
    _make_entry(client, code_id, "2026-07-03", 540, 600)

    response = client.delete(f"/api/codes/{code_id}/blocking-entries")

    assert response.status_code == 200
    assert response.json()["total"] == 0
    assert client.get("/api/entries?from=2026-07-01&to=2026-07-31").json() == []
    assert client.delete(f"/api/codes/{code_id}").status_code == 204
