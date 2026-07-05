"""Tests for the settings + absences endpoints (BIZ-006, BIZ-027)."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_get_settings_returns_defaults(client: TestClient) -> None:
    body = client.get("/api/settings").json()

    assert body["workdays"] == [False, True, True, True, True, True, False]
    assert body["density"] == "comfortable"
    assert body["period_scheme"] == "semi_monthly"
    assert body["theme"] == "system"
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


def test_update_settings_without_period_scheme_keeps_default(client: TestClient) -> None:
    response = client.put(
        "/api/settings",
        json={"workdays": [True, True, True, True, True, False, False], "density": "compact"},
    )

    assert response.json()["period_scheme"] == "semi_monthly"


def test_period_scheme_round_trips_through_settings(client: TestClient) -> None:
    for scheme in ("weekly", "semi_monthly", "monthly"):
        response = client.put(
            "/api/settings",
            json={
                "workdays": [False, True, True, True, True, True, False],
                "density": "comfortable",
                "period_scheme": scheme,
            },
        )

        assert response.status_code == 200
        assert response.json()["period_scheme"] == scheme
        assert client.get("/api/settings").json()["period_scheme"] == scheme


def test_update_settings_without_theme_keeps_default(client: TestClient) -> None:
    response = client.put(
        "/api/settings",
        json={"workdays": [True, True, True, True, True, False, False], "density": "compact"},
    )

    assert response.json()["theme"] == "system"


def test_theme_round_trips_through_settings(client: TestClient) -> None:
    for theme in ("dark", "light", "system"):
        response = client.put(
            "/api/settings",
            json={
                "workdays": [False, True, True, True, True, True, False],
                "density": "comfortable",
                "theme": theme,
            },
        )

        assert response.status_code == 200
        assert response.json()["theme"] == theme
        assert client.get("/api/settings").json()["theme"] == theme


def test_update_settings_without_theme_field_leaves_stored_value_unchanged(client: TestClient) -> None:
    client.put(
        "/api/settings",
        json={
            "workdays": [False, True, True, True, True, True, False],
            "density": "comfortable",
            "theme": "dark",
        },
    )

    response = client.put(
        "/api/settings",
        json={"workdays": [True, True, True, True, True, False, False], "density": "compact"},
    )

    assert response.json()["theme"] == "dark"


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
