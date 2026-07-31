"""Tests for GET /api/codes/likely — the contextual likely-codes endpoint (BIZ-083, ADR-0015)."""

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


def _seed_code(
    session: Session,
    user_id: int,
    number: str,
    name: str,
    activities: tuple[str, ...],
    *,
    backing_only: bool = False,
) -> TimesheetCode:
    code = TimesheetCode(
        user_id=user_id,
        number=number,
        label=f"label {number}",
        name=name,
        color="#3b82f6",
        backing_only=backing_only,
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


def test_likely_returns_the_ranked_pairs_for_the_given_moment(client: TestClient, session: Session) -> None:
    user = _seed_user(session)
    code = _seed_code(session, user.id, "N9/1042", "Paper V4", ("Bug fixing", "Change request"))
    for day in WEDNESDAYS:
        _seed_entry(session, user.id, day, 570, code.id, "Bug fixing")

    response = client.get(f"/api/codes/likely?at={AT_WEDNESDAY_0930}")

    assert response.status_code == 200
    # No score in the payload — ADR-0015 forbids surfacing one, so it is not even sent.
    assert response.json() == [
        {
            "code_id": code.id,
            "number": "N9/1042",
            "name": "Paper V4",
            "color": "#3b82f6",
            "activity": "Bug fixing",
        }
    ]


def test_likely_follows_the_hour_of_the_context(client: TestClient, session: Session) -> None:
    user = _seed_user(session)
    morning = _seed_code(session, user.id, "N9/1", "Morning work", ("Dev",))
    afternoon = _seed_code(session, user.id, "N9/2", "Afternoon work", ("Admin",))
    for day in WEDNESDAYS:
        _seed_entry(session, user.id, day, 545, morning.id, "Dev")  # 09:05
        _seed_entry(session, user.id, day, 870, afternoon.id, "Admin")  # 14:30

    at_morning = client.get(f"/api/codes/likely?at={AT_WEDNESDAY_0930}").json()
    at_afternoon = client.get("/api/codes/likely?at=2026-07-29T14:00:00").json()

    assert [row["name"] for row in at_morning] == ["Morning work"]
    assert [row["name"] for row in at_afternoon] == ["Afternoon work"]


def test_likely_is_empty_without_enough_history(client: TestClient, session: Session) -> None:
    user = _seed_user(session)
    code = _seed_code(session, user.id, "N9/1", "Rare", ("Dev",))
    _seed_entry(session, user.id, WEDNESDAYS[0], 630, code.id, "Dev")  # once, an hour off

    response = client.get(f"/api/codes/likely?at={AT_WEDNESDAY_0930}")

    assert response.status_code == 200
    assert response.json() == []


def test_likely_excludes_vanished_activities_and_backing_only_codes(client: TestClient, session: Session) -> None:
    user = _seed_user(session)
    renamed = _seed_code(session, user.id, "N9/1", "Renamed activities", ("Dev",))
    backing = _seed_code(session, user.id, "N9/2", "Hidden backing", ("Dev",), backing_only=True)
    for day in WEDNESDAYS:
        _seed_entry(session, user.id, day, 570, renamed.id, "Legacy")  # activity no longer on the code
        _seed_entry(session, user.id, day, 570, backing.id, "Dev")

    response = client.get(f"/api/codes/likely?at={AT_WEDNESDAY_0930}")

    assert response.json() == []


def test_likely_respects_the_limit(client: TestClient, session: Session) -> None:
    user = _seed_user(session)
    first = _seed_code(session, user.id, "N9/1", "A code", ("Dev",))
    second = _seed_code(session, user.id, "N9/2", "B code", ("Dev",))
    for day in WEDNESDAYS:
        _seed_entry(session, user.id, day, 570, first.id, "Dev")
        _seed_entry(session, user.id, day, 575, second.id, "Dev")

    assert len(client.get(f"/api/codes/likely?at={AT_WEDNESDAY_0930}").json()) == 2
    assert len(client.get(f"/api/codes/likely?at={AT_WEDNESDAY_0930}&limit=1").json()) == 1


def test_likely_rejects_a_malformed_or_missing_moment(client: TestClient, session: Session) -> None:
    _seed_user(session)

    assert client.get("/api/codes/likely?at=not-a-date").status_code == 422
    assert client.get("/api/codes/likely").status_code == 422


def test_likely_rejects_an_out_of_range_limit(client: TestClient, session: Session) -> None:
    _seed_user(session)

    assert client.get(f"/api/codes/likely?at={AT_WEDNESDAY_0930}&limit=0").status_code == 422
    assert client.get(f"/api/codes/likely?at={AT_WEDNESDAY_0930}&limit=11").status_code == 422
