"""Tests for GET /api/codes/switch-targets — the Switch blocks band (BIZ-093, ADR-0016)."""

from __future__ import annotations

from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from walker.config import settings
from walker.models import Activity, Entry, TimesheetCode, User

WEDNESDAYS = [date(2026, 7, 22), date(2026, 7, 15), date(2026, 7, 8), date(2026, 7, 1)]
AT_WEDNESDAY_0930 = "2026-07-29T09:30:00"


def _seed_user(session: Session) -> User:
    user = User(username=settings.default_user)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def _seed_code(session: Session, user_id: int, number: str, name: str, activities: tuple[str, ...]) -> TimesheetCode:
    code = TimesheetCode(
        user_id=user_id,
        number=number,
        label=f"label {number}",
        name=name,
        color="#3b82f6",
        activities=[Activity(code=f"{index:04d}", label=label) for index, label in enumerate(activities, start=1)],
    )
    session.add(code)
    session.commit()
    session.refresh(code)
    return code


def _seed_entry(session: Session, user_id: int, on: date, start: int, code_id: int, activity: str) -> None:
    session.add(
        Entry(
            user_id=user_id,
            date=on,
            start_minute=start,
            end_minute=start + 30,
            timesheet_code_id=code_id,
            activity=activity,
        )
    )
    session.commit()


def test_switch_targets_returns_one_block_per_code_with_its_activities(client: TestClient, session: Session) -> None:
    user = _seed_user(session)
    code = _seed_code(session, user.id, "N9/1042", "Paper V4", ("Bug fixing", "Change request"))
    for day in WEDNESDAYS:
        _seed_entry(session, user.id, day, 570, code.id, "Change request")

    response = client.get(f"/api/codes/switch-targets?at={AT_WEDNESDAY_0930}")

    assert response.status_code == 200
    assert response.json() == [
        {
            "code_id": code.id,
            "number": "N9/1042",
            "name": "Paper V4",
            "color": "#3b82f6",
            "activity": "Change request",
            "activities": ["Bug fixing", "Change request"],
        }
    ]


def test_switch_targets_honours_the_limit_and_excludes_the_running_code(client: TestClient, session: Session) -> None:
    user = _seed_user(session)
    running = _seed_code(session, user.id, "N9/1", "Alpha", ("Dev",))
    other = _seed_code(session, user.id, "N9/2", "Bravo", ("Dev",))
    _seed_code(session, user.id, "N9/3", "Charlie", ("Dev",))
    for day in WEDNESDAYS:
        _seed_entry(session, user.id, day, 570, running.id, "Dev")
        _seed_entry(session, user.id, day, 600, other.id, "Dev")

    response = client.get(f"/api/codes/switch-targets?at={AT_WEDNESDAY_0930}&limit=2&exclude={running.id}")

    assert response.status_code == 200
    assert [row["name"] for row in response.json()] == ["Bravo"]


def test_switch_targets_rejects_a_zero_limit(client: TestClient, session: Session) -> None:
    """A disabled band (``switch_count`` 0) means the SPA does not call at all, like the likely band."""
    _seed_user(session)

    response = client.get(f"/api/codes/switch-targets?at={AT_WEDNESDAY_0930}&limit=0")

    assert response.status_code == 422


def test_switch_targets_is_empty_without_history(client: TestClient, session: Session) -> None:
    user = _seed_user(session)
    _seed_code(session, user.id, "N9/1", "Alpha", ("Dev",))

    response = client.get(f"/api/codes/switch-targets?at={AT_WEDNESDAY_0930}")

    assert response.status_code == 200
    assert response.json() == []
