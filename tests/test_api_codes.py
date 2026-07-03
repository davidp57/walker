"""Tests for the code catalog read endpoint (BIZ-001)."""

from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from walker.config import settings
from walker.models import Activity, TimesheetCode, User


def _seed_user(session: Session, username: str) -> User:
    user = User(username=username)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def test_list_codes_returns_user_codes_with_activities(client: TestClient, session: Session) -> None:
    user = _seed_user(session, settings.default_user)
    session.add(
        TimesheetCode(
            user_id=user.id,
            number="N9/1042",
            label="MNT - PAP V4",
            name="Paper V4",
            color="#3b82f6",
            activities=[
                Activity(code="0001", label="Bug fixing"),
                Activity(code="0002", label="Change request"),
            ],
        )
    )
    session.commit()

    response = client.get("/api/codes")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["number"] == "N9/1042"
    assert body[0]["label"] == "MNT - PAP V4"
    assert body[0]["name"] == "Paper V4"
    assert body[0]["color"] == "#3b82f6"
    assert body[0]["activities"] == [
        {"code": "0001", "label": "Bug fixing"},
        {"code": "0002", "label": "Change request"},
    ]


def test_list_codes_bootstraps_default_user_on_empty_db(client: TestClient, session: Session) -> None:
    response = client.get("/api/codes")

    assert response.status_code == 200
    assert response.json() == []
    assert session.scalar(select(User).where(User.username == settings.default_user)) is not None


def test_list_codes_is_scoped_to_current_user(client: TestClient, session: Session) -> None:
    me = _seed_user(session, settings.default_user)
    other = _seed_user(session, "someone-else")
    session.add(TimesheetCode(user_id=other.id, number="N9/0007", label="INT", name="INT", color="#111"))
    session.add(TimesheetCode(user_id=me.id, number="N9/1042", label="MNT", name="MNT", color="#222"))
    session.commit()

    body = client.get("/api/codes").json()

    assert [code["number"] for code in body] == ["N9/1042"]


def test_list_codes_marks_real_codes_as_not_virtual(client: TestClient) -> None:
    client.post("/api/codes", json={"number": "N9/1042", "label": "MNT", "activities": []})

    body = client.get("/api/codes").json()

    assert body[0]["is_virtual"] is False
    assert body[0]["real_code_id"] is None
    assert body[0]["real_code_number"] is None


def _create_real_code(client: TestClient) -> dict[str, object]:
    return client.post(
        "/api/codes",
        json={
            "number": "N9/1042",
            "label": "MNT - PAP V4",
            "name": "Paper V4",
            "activities": [{"code": "0001", "label": "Bug fixing"}],
        },
    ).json()


def test_create_virtual_code_borrows_number_label_and_activities(client: TestClient) -> None:
    real = _create_real_code(client)

    response = client.post(
        "/api/codes/virtual",
        json={"real_code_id": real["id"], "name": "Workday contact info", "color": "#abcdef"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Workday contact info"
    assert body["color"] == "#abcdef"
    assert body["number"] == real["number"]
    assert body["label"] == real["label"]
    assert body["activities"] == real["activities"]
    assert body["is_virtual"] is True
    assert body["real_code_id"] == real["id"]
    assert body["real_code_number"] == real["number"]


def test_create_virtual_code_auto_assigns_color_when_omitted(client: TestClient) -> None:
    real = _create_real_code(client)

    response = client.post("/api/codes/virtual", json={"real_code_id": real["id"], "name": "Sub-project"})

    assert response.status_code == 201
    assert response.json()["color"].startswith("#")


def test_several_virtual_codes_can_share_one_real_code(client: TestClient) -> None:
    real = _create_real_code(client)
    client.post("/api/codes/virtual", json={"real_code_id": real["id"], "name": "Project A"})
    client.post("/api/codes/virtual", json={"real_code_id": real["id"], "name": "Project B"})

    body = client.get("/api/codes").json()

    virtuals = [c for c in body if c["is_virtual"]]
    assert {c["name"] for c in virtuals} == {"Project A", "Project B"}
    assert all(c["real_code_id"] == real["id"] for c in virtuals)


def test_create_virtual_code_rejects_duplicate_name(client: TestClient) -> None:
    real = _create_real_code(client)
    client.post("/api/codes/virtual", json={"real_code_id": real["id"], "name": "Project A"})

    response = client.post("/api/codes/virtual", json={"real_code_id": real["id"], "name": "Project A"})

    assert response.status_code == 409


def test_create_virtual_code_rejects_unknown_real_code(client: TestClient) -> None:
    response = client.post("/api/codes/virtual", json={"real_code_id": 999, "name": "Project A"})

    assert response.status_code == 404


def test_create_virtual_code_rejects_virtual_as_backing_code(client: TestClient) -> None:
    real = _create_real_code(client)
    virtual = client.post("/api/codes/virtual", json={"real_code_id": real["id"], "name": "Project A"}).json()

    response = client.post("/api/codes/virtual", json={"real_code_id": virtual["id"], "name": "Project B"})

    assert response.status_code == 409


def test_catalog_import_never_creates_or_touches_virtual_codes(client: TestClient) -> None:
    real = _create_real_code(client)
    client.post("/api/codes/virtual", json={"real_code_id": real["id"], "name": "Project A"})
    csv = (
        "code_number,code_label,code_name,activity_code,activity_label\n"
        "N9/1042,MNT - PAP V4,Paper V4,0002,New activity\n"
    )

    response = client.post("/api/catalog/import", files={"file": ("codes.csv", csv, "text/csv")})

    assert response.status_code == 200
    body = client.get("/api/codes").json()
    virtuals = [c for c in body if c["is_virtual"]]
    assert len(virtuals) == 1
    assert virtuals[0]["name"] == "Project A"


def test_update_virtual_code_changes_name_color_and_target(client: TestClient) -> None:
    real = _create_real_code(client)
    other_real = client.post(
        "/api/codes",
        json={"number": "N9/2000", "label": "OTHER", "activities": [{"code": "0001", "label": "A"}]},
    ).json()
    virtual = client.post(
        "/api/codes/virtual", json={"real_code_id": real["id"], "name": "Project A", "color": "#111111"}
    ).json()

    response = client.put(
        f"/api/codes/virtual/{virtual['id']}",
        json={"real_code_id": other_real["id"], "name": "Project A Renamed", "color": "#222222"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Project A Renamed"
    assert body["color"] == "#222222"
    assert body["real_code_id"] == other_real["id"]
    assert body["number"] == other_real["number"]
    assert body["label"] == other_real["label"]

    listed = client.get("/api/codes").json()
    updated = next(c for c in listed if c["id"] == virtual["id"])
    assert updated["name"] == "Project A Renamed"
    assert updated["real_code_number"] == other_real["number"]


def test_update_virtual_code_allows_keeping_its_own_name(client: TestClient) -> None:
    real = _create_real_code(client)
    virtual = client.post("/api/codes/virtual", json={"real_code_id": real["id"], "name": "Project A"}).json()

    response = client.put(
        f"/api/codes/virtual/{virtual['id']}",
        json={"real_code_id": real["id"], "name": "Project A", "color": "#333333"},
    )

    assert response.status_code == 200
    assert response.json()["color"] == "#333333"


def test_update_virtual_code_rejects_duplicate_name_of_another_virtual_code(client: TestClient) -> None:
    real = _create_real_code(client)
    client.post("/api/codes/virtual", json={"real_code_id": real["id"], "name": "Project A"})
    virtual_b = client.post("/api/codes/virtual", json={"real_code_id": real["id"], "name": "Project B"}).json()

    response = client.put(
        f"/api/codes/virtual/{virtual_b['id']}",
        json={"real_code_id": real["id"], "name": "Project A"},
    )

    assert response.status_code == 409


def test_update_virtual_code_rejects_unknown_real_code(client: TestClient) -> None:
    real = _create_real_code(client)
    virtual = client.post("/api/codes/virtual", json={"real_code_id": real["id"], "name": "Project A"}).json()

    response = client.put(
        f"/api/codes/virtual/{virtual['id']}",
        json={"real_code_id": 999, "name": "Project A"},
    )

    assert response.status_code == 404


def test_update_virtual_code_rejects_virtual_as_new_target(client: TestClient) -> None:
    real = _create_real_code(client)
    virtual_a = client.post("/api/codes/virtual", json={"real_code_id": real["id"], "name": "Project A"}).json()
    virtual_b = client.post("/api/codes/virtual", json={"real_code_id": real["id"], "name": "Project B"}).json()

    response = client.put(
        f"/api/codes/virtual/{virtual_b['id']}",
        json={"real_code_id": virtual_a["id"], "name": "Project B"},
    )

    assert response.status_code == 409


def test_delete_unused_virtual_code_succeeds(client: TestClient) -> None:
    real = _create_real_code(client)
    virtual = client.post("/api/codes/virtual", json={"real_code_id": real["id"], "name": "Project A"}).json()

    response = client.delete(f"/api/codes/{virtual['id']}")

    assert response.status_code == 204
    body = client.get("/api/codes").json()
    assert all(c["id"] != virtual["id"] for c in body)


def test_delete_virtual_code_referenced_by_entry_is_blocked(client: TestClient) -> None:
    real = _create_real_code(client)
    virtual = client.post("/api/codes/virtual", json={"real_code_id": real["id"], "name": "Project A"}).json()
    client.post(
        "/api/entries",
        json={
            "date": "2026-07-01",
            "start_minute": 540,
            "end_minute": 600,
            "timesheet_code_id": virtual["id"],
            "activity": real["activities"][0]["label"],
        },
    )

    response = client.delete(f"/api/codes/{virtual['id']}")

    assert response.status_code == 409


def test_delete_real_code_with_virtual_child_is_blocked(client: TestClient) -> None:
    real = _create_real_code(client)
    client.post("/api/codes/virtual", json={"real_code_id": real["id"], "name": "Project A"})

    response = client.delete(f"/api/codes/{real['id']}")

    assert response.status_code == 409

    body = client.get("/api/codes").json()
    assert any(c["id"] == real["id"] for c in body)
