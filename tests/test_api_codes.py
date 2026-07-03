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
