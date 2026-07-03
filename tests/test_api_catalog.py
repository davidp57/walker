"""Tests for the catalog CRUD + import endpoints (BIZ-002)."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_create_code_persists_and_is_listed(client: TestClient) -> None:
    response = client.post(
        "/api/codes",
        json={
            "number": "N9/1042",
            "label": "MNT - PAP V4",
            "name": "Paper V4",
            "color": "#123456",
            "activities": [{"code": "0001", "label": "Bug fixing"}],
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["number"] == "N9/1042"
    assert body["activities"] == [{"code": "0001", "label": "Bug fixing"}]
    assert len(client.get("/api/codes").json()) == 1


def test_create_code_defaults_name_to_label_and_auto_assigns_color(client: TestClient) -> None:
    response = client.post("/api/codes", json={"number": "N9/0007", "label": "INT", "activities": []})

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "INT"
    assert body["color"].startswith("#")


def test_update_code_replaces_fields_and_activities(client: TestClient) -> None:
    code_id = client.post(
        "/api/codes",
        json={"number": "N9/1", "label": "L", "activities": [{"code": "0001", "label": "A"}]},
    ).json()["id"]

    response = client.put(
        f"/api/codes/{code_id}",
        json={
            "number": "N9/1",
            "label": "L2",
            "name": "N2",
            "color": "#222222",
            "activities": [{"code": "0002", "label": "B"}],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["label"] == "L2"
    assert body["name"] == "N2"
    assert body["activities"] == [{"code": "0002", "label": "B"}]


def test_delete_code_not_in_use(client: TestClient) -> None:
    code_id = client.post("/api/codes", json={"number": "N9/1", "label": "L", "activities": []}).json()["id"]

    assert client.delete(f"/api/codes/{code_id}").status_code == 204
    assert client.get("/api/codes").json() == []


def test_delete_code_blocked_when_referenced_by_entry(client: TestClient) -> None:
    code_id = client.post("/api/codes", json={"number": "N9/1", "label": "L", "activities": []}).json()["id"]
    entry_id = client.post("/api/timer/start").json()["id"]
    client.patch(f"/api/entries/{entry_id}", json={"timesheet_code_id": code_id})

    response = client.delete(f"/api/codes/{code_id}")

    assert response.status_code == 409
    assert len(client.get("/api/codes").json()) == 1
