"""Tests for the settings + absences endpoints (BIZ-006)."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_get_settings_returns_defaults(client: TestClient) -> None:
    body = client.get("/api/settings").json()

    assert body["workdays"] == [False, True, True, True, True, True, False]
    assert body["density"] == "comfortable"
    assert body["absences"] == []


def test_update_settings_persists(client: TestClient) -> None:
    response = client.put(
        "/api/settings",
        json={"workdays": [True, True, True, True, True, False, False], "density": "compact"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["workdays"] == [True, True, True, True, True, False, False]
    assert body["density"] == "compact"
    assert client.get("/api/settings").json()["density"] == "compact"


def test_add_and_remove_absence(client: TestClient) -> None:
    added = client.post("/api/settings/absences", json={"date": "2026-07-14", "reason": "Annual leave"})
    assert added.status_code == 200
    assert added.json()["absences"] == [{"date": "2026-07-14", "reason": "Annual leave"}]

    # Re-adding the same date updates the reason (idempotent by date).
    client.post("/api/settings/absences", json={"date": "2026-07-14", "reason": "Public holiday"})
    assert client.get("/api/settings").json()["absences"] == [{"date": "2026-07-14", "reason": "Public holiday"}]

    removed = client.delete("/api/settings/absences/2026-07-14")
    assert removed.status_code == 200
    assert removed.json()["absences"] == []
