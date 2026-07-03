"""Tests for the checklist endpoints (BIZ-005)."""

from __future__ import annotations

from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from walker.config import settings
from walker.models import Entry, TimesheetCode, User


def _seed(session: Session) -> int:
    user = User(username=settings.default_user)
    session.add(user)
    session.commit()
    session.refresh(user)
    code = TimesheetCode(user_id=user.id, number="N9/1", label="L", name="N", color="#111")
    session.add(code)
    session.commit()
    session.refresh(code)
    session.add_all(
        [
            Entry(
                user_id=user.id,
                date=date(2026, 7, 1),
                start_minute=540,
                end_minute=600,
                timesheet_code_id=code.id,
                activity="Bug fixing",
            ),
            Entry(
                user_id=user.id,
                date=date(2026, 7, 2),
                start_minute=540,
                end_minute=600,
                timesheet_code_id=code.id,
                activity="Bug fixing",
            ),
        ]
    )
    session.commit()
    return code.id


def test_checklist_items_match_nonempty_grid_cells(client: TestClient, session: Session) -> None:
    code_id = _seed(session)

    body = client.get("/api/fortnight/2026-07-02/checklist").json()

    assert body["total"] == 2
    assert body["entered"] == 0
    cells = {(item["timesheet_code_id"], item["activity"], item["day"]) for item in body["items"]}
    assert cells == {(code_id, "Bug fixing", 1), (code_id, "Bug fixing", 2)}


def test_toggle_persists_and_updates_progress(client: TestClient, session: Session) -> None:
    code_id = _seed(session)

    response = client.patch(
        "/api/fortnight/2026-07-02/checklist",
        json={"timesheet_code_id": code_id, "activity": "Bug fixing", "day": 1, "entered": True},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["entered"] == 1
    assert next(item for item in body["items"] if item["day"] == 1)["entered"] is True

    again = client.patch(
        "/api/fortnight/2026-07-02/checklist",
        json={"timesheet_code_id": code_id, "activity": "Bug fixing", "day": 1, "entered": True},
    )
    assert again.json()["entered"] == 1


def test_reset_clears_all_marks(client: TestClient, session: Session) -> None:
    code_id = _seed(session)
    client.patch(
        "/api/fortnight/2026-07-02/checklist",
        json={"timesheet_code_id": code_id, "activity": "Bug fixing", "day": 1, "entered": True},
    )

    response = client.delete("/api/fortnight/2026-07-02/checklist")

    assert response.status_code == 200
    assert response.json()["entered"] == 0
