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


def test_get_settings_includes_default_view_preferences(client: TestClient) -> None:
    prefs = client.get("/api/settings").json()["view_preferences"]

    assert prefs == {
        "task_view": "list",
        "task_group": "none",
        "task_sort": "due",
        "task_sort_dir": "asc",
        "period_mode": "review",
        "done_collapsed": False,
    }


def test_patch_view_preferences_merges_and_persists(client: TestClient) -> None:
    response = client.patch(
        "/api/view-preferences",
        json={"task_view": "board", "task_group": "code", "done_collapsed": True},
    )

    assert response.status_code == 200
    prefs = response.json()["view_preferences"]
    assert prefs["task_view"] == "board"
    assert prefs["task_group"] == "code"
    assert prefs["done_collapsed"] is True
    assert prefs["task_sort"] == "due"  # untouched key keeps its default

    # Persists across requests, and a later partial patch keeps earlier keys.
    client.patch("/api/view-preferences", json={"period_mode": "enter"})
    reloaded = client.get("/api/settings").json()["view_preferences"]
    assert reloaded["task_view"] == "board"
    assert reloaded["period_mode"] == "enter"


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


def test_add_absence_range_fans_out_per_day_including_weekend(client: TestClient) -> None:
    # 2026-07-10 (Fri) → 2026-07-13 (Mon) inclusive spans Sat 11 + Sun 12.
    added = client.post(
        "/api/settings/absences",
        json={"date": "2026-07-10", "end": "2026-07-13", "reason": "Annual leave"},
    )
    assert added.status_code == 200
    dates = [a["date"] for a in added.json()["absences"]]
    assert dates == ["2026-07-10", "2026-07-11", "2026-07-12", "2026-07-13"]
    assert all(a["reason"] == "Annual leave" for a in added.json()["absences"])


def test_add_absence_without_end_adds_single_day(client: TestClient) -> None:
    added = client.post("/api/settings/absences", json={"date": "2026-07-14", "reason": "Leave"})
    assert added.status_code == 200
    assert added.json()["absences"] == [{"date": "2026-07-14", "reason": "Leave"}]


def test_add_absence_range_is_idempotent_and_updates_reason(client: TestClient) -> None:
    client.post("/api/settings/absences", json={"date": "2026-07-14", "reason": "Leave"})
    # Overlapping range re-posts the 14th and adds 15th, no duplicate for the 14th, reason updated.
    body = client.post(
        "/api/settings/absences",
        json={"date": "2026-07-14", "end": "2026-07-15", "reason": "Holiday"},
    ).json()
    assert [a["date"] for a in body["absences"]] == ["2026-07-14", "2026-07-15"]
    assert all(a["reason"] == "Holiday" for a in body["absences"])


def test_add_absence_range_rejects_end_before_start(client: TestClient) -> None:
    resp = client.post(
        "/api/settings/absences",
        json={"date": "2026-07-15", "end": "2026-07-10", "reason": "Leave"},
    )
    assert resp.status_code == 422


def test_add_absence_range_rejects_too_long_a_range(client: TestClient) -> None:
    resp = client.post(
        "/api/settings/absences",
        json={"date": "2026-01-01", "end": "2027-06-01", "reason": "Leave"},
    )
    assert resp.status_code == 422
