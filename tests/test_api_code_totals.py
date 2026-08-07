"""Endpoint for per-code time totals over an arbitrary range (BIZ-089)."""

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


def _entry(client: TestClient, code_id: int, day: str, minutes: int, activity: str = "Build") -> None:
    response = client.post(
        "/api/entries",
        json={
            "date": day,
            "start_minute": 540,
            "end_minute": 540 + minutes,
            "timesheet_code_id": code_id,
            "activity": activity,
        },
    )
    assert response.status_code == 201


def test_all_time_totals_without_any_date_parameter(client: TestClient) -> None:
    code_id = _make_code(client, "Paper", "N9/1042")
    _entry(client, code_id, "2025-01-05", 60)
    _entry(client, code_id, "2026-07-03", 30)

    body = client.get(f"/api/codes/{code_id}/totals").json()

    assert body["minutes"] == 90
    assert body["entries"] == 2
    assert body["days"] == 2
    assert body["start"] is None and body["end"] is None


def test_range_narrows_the_totals(client: TestClient) -> None:
    code_id = _make_code(client, "Paper", "N9/1042")
    _entry(client, code_id, "2026-06-30", 60)
    _entry(client, code_id, "2026-07-15", 30)

    body = client.get(f"/api/codes/{code_id}/totals?from=2026-07-01&to=2026-07-31").json()

    assert body["minutes"] == 30
    assert body["start"] == "2026-07-01"
    assert body["end"] == "2026-07-31"


def test_breakdown_is_returned_largest_first(client: TestClient) -> None:
    code_id = _make_code(client, "Paper", "N9/1042")
    _entry(client, code_id, "2026-07-03", 30, activity="Support")
    _entry(client, code_id, "2026-07-04", 120, activity="Build")

    rows = client.get(f"/api/codes/{code_id}/totals").json()["by_activity"]

    assert [(r["activity"], r["minutes"]) for r in rows] == [("Build", 120), ("Support", 30)]


def test_a_running_timer_is_flagged_and_excluded(client: TestClient) -> None:
    code_id = _make_code(client, "Paper", "N9/1042")
    _entry(client, code_id, "2026-07-03", 60)
    client.post("/api/timer/start")
    client.post("/api/timer/switch", json={"timesheet_code_id": code_id, "activity": "Build"})

    body = client.get(f"/api/codes/{code_id}/totals").json()

    assert body["running"] is True
    assert body["minutes"] == 60


def test_a_real_code_carries_a_rollup_over_its_virtual_children(client: TestClient) -> None:
    real_id = _make_code(client, "Paper", "N9/1042")
    virtual = client.post("/api/codes/virtual", json={"real_code_id": real_id, "name": "Paper — infra"})
    assert virtual.status_code == 201
    virtual_id = int(virtual.json()["id"])
    _entry(client, real_id, "2026-07-03", 60)
    _entry(client, virtual_id, "2026-07-04", 30)

    real = client.get(f"/api/codes/{real_id}/totals").json()
    child = client.get(f"/api/codes/{virtual_id}/totals").json()

    # The virtual code reports itself (ADR-0008), the real code reports itself plus a roll-up.
    assert child["minutes"] == 30
    assert child["rollup"] is None
    assert real["minutes"] == 60
    assert real["rollup"]["minutes"] == 90


def test_no_rollup_without_virtual_children(client: TestClient) -> None:
    code_id = _make_code(client, "Paper", "N9/1042")
    _entry(client, code_id, "2026-07-03", 60)

    assert client.get(f"/api/codes/{code_id}/totals").json()["rollup"] is None


def test_empty_range_reports_zero_rather_than_failing(client: TestClient) -> None:
    code_id = _make_code(client, "Paper", "N9/1042")
    _entry(client, code_id, "2026-07-03", 60)

    body = client.get(f"/api/codes/{code_id}/totals?from=2020-01-01&to=2020-12-31").json()

    assert body["minutes"] == 0
    assert body["entries"] == 0
    assert body["by_activity"] == []


def test_end_before_start_is_422(client: TestClient) -> None:
    code_id = _make_code(client, "Paper", "N9/1042")

    response = client.get(f"/api/codes/{code_id}/totals?from=2026-07-31&to=2026-07-01")

    assert response.status_code == 422


def test_unknown_code_is_404(client: TestClient) -> None:
    assert client.get("/api/codes/999/totals").status_code == 404
