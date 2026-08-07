"""Endpoint for retiring a code, with its optional open-period sweep (BIZ-090)."""

from __future__ import annotations

from fastapi.testclient import TestClient


def _make_code(client: TestClient, name: str, number: str) -> int:
    response = client.post(
        "/api/codes",
        json={
            "number": number,
            "label": f"MNT - {name}",
            "name": name,
            "activities": [{"code": "0001", "label": "Build"}],
        },
    )
    assert response.status_code == 201
    return int(response.json()["id"])


def _entry(client: TestClient, code_id: int, day: str) -> int:
    response = client.post(
        "/api/entries",
        json={
            "date": day,
            "start_minute": 540,
            "end_minute": 600,
            "timesheet_code_id": code_id,
            "activity": "Build",
        },
    )
    assert response.status_code == 201
    return int(response.json()["id"])


def test_codes_are_live_by_default(client: TestClient) -> None:
    _make_code(client, "Paper", "N9/1042")

    assert client.get("/api/codes").json()[0]["obsolete"] is False


def test_marking_obsolete_round_trips(client: TestClient) -> None:
    code_id = _make_code(client, "Paper", "N9/1042")

    response = client.put(f"/api/codes/{code_id}/obsolete", json={"obsolete": True})

    assert response.status_code == 200
    assert response.json()["obsolete"] is True
    assert client.get("/api/codes").json()[0]["obsolete"] is True


def test_a_code_can_be_brought_back(client: TestClient) -> None:
    code_id = _make_code(client, "Paper", "N9/1042")
    client.put(f"/api/codes/{code_id}/obsolete", json={"obsolete": True})

    assert client.put(f"/api/codes/{code_id}/obsolete", json={"obsolete": False}).json()["obsolete"] is False


def test_an_obsolete_code_is_still_returned_so_past_entries_resolve(client: TestClient) -> None:
    code_id = _make_code(client, "Paper", "N9/1042")
    _entry(client, code_id, "2026-07-03")
    client.put(f"/api/codes/{code_id}/obsolete", json={"obsolete": True})

    assert [c["id"] for c in client.get("/api/codes").json()] == [code_id]


def test_unknown_code_is_404(client: TestClient) -> None:
    assert client.put("/api/codes/999/obsolete", json={"obsolete": True}).status_code == 404


def test_the_sweep_moves_only_the_window_then_retires_the_code(client: TestClient) -> None:
    old = _make_code(client, "Paper", "N9/1042")
    new = _make_code(client, "Successor", "N9/2000")
    outside = _entry(client, old, "2026-06-30")
    inside = _entry(client, old, "2026-07-10")

    response = client.put(
        f"/api/codes/{old}/obsolete",
        json={
            "obsolete": True,
            "sweep": {
                "target_code_id": new,
                "activity": "Build",
                "start": "2026-07-01",
                "end": "2026-07-31",
            },
        },
    )

    assert response.status_code == 200
    assert response.json()["obsolete"] is True
    entries = {e["id"]: e for e in client.get("/api/entries?from=2026-06-01&to=2026-08-31").json()}
    assert entries[inside]["timesheet_code_id"] == new
    assert entries[inside]["activity"] == "Build"
    assert entries[outside]["timesheet_code_id"] == old  # earlier periods are already declared


def test_retiring_without_a_sweep_touches_no_entry(client: TestClient) -> None:
    code_id = _make_code(client, "Paper", "N9/1042")
    entry_id = _entry(client, code_id, "2026-07-10")

    client.put(f"/api/codes/{code_id}/obsolete", json={"obsolete": True})

    entries = client.get("/api/entries?from=2026-07-01&to=2026-07-31").json()
    assert [e["timesheet_code_id"] for e in entries if e["id"] == entry_id] == [code_id]


def test_a_sweep_onto_an_obsolete_target_is_rejected(client: TestClient) -> None:
    old = _make_code(client, "Paper", "N9/1042")
    new = _make_code(client, "Also retired", "N9/2000")
    _entry(client, old, "2026-07-10")
    client.put(f"/api/codes/{new}/obsolete", json={"obsolete": True})

    response = client.put(
        f"/api/codes/{old}/obsolete",
        json={
            "obsolete": True,
            "sweep": {
                "target_code_id": new,
                "activity": "Build",
                "start": "2026-07-01",
                "end": "2026-07-31",
            },
        },
    )

    assert response.status_code == 422
    # The flag must not have been applied either — the whole call is one intent.
    assert client.get("/api/codes").json()[0]["obsolete"] is False


def test_a_sweep_with_a_blank_activity_is_rejected(client: TestClient) -> None:
    old = _make_code(client, "Paper", "N9/1042")
    new = _make_code(client, "Successor", "N9/2000")

    response = client.put(
        f"/api/codes/{old}/obsolete",
        json={
            "obsolete": True,
            "sweep": {"target_code_id": new, "activity": "", "start": "2026-07-01", "end": "2026-07-31"},
        },
    )

    assert response.status_code == 422
