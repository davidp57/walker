"""Tests for the checklist endpoints (BIZ-005, BIZ-027)."""

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


def _seed_virtual_codes(session: Session) -> tuple[int, int, int]:
    user = User(username=settings.default_user)
    session.add(user)
    session.commit()
    session.refresh(user)
    real = TimesheetCode(user_id=user.id, number="N9/1", label="L", name="Real", color="#111")
    session.add(real)
    session.commit()
    session.refresh(real)
    virtual_a = TimesheetCode(
        user_id=user.id, number="N9/1", label="L", name="Project A", color="#222", real_code_id=real.id
    )
    virtual_b = TimesheetCode(
        user_id=user.id, number="N9/1", label="L", name="Project B", color="#333", real_code_id=real.id
    )
    session.add_all([virtual_a, virtual_b])
    session.commit()
    session.refresh(virtual_a)
    session.refresh(virtual_b)
    session.add_all(
        [
            Entry(
                user_id=user.id,
                date=date(2026, 7, 1),
                start_minute=540,
                end_minute=600,
                timesheet_code_id=virtual_a.id,
                activity="Bug fixing",
            ),
            Entry(
                user_id=user.id,
                date=date(2026, 7, 1),
                start_minute=600,
                end_minute=630,
                timesheet_code_id=virtual_b.id,
                activity="Bug fixing",
            ),
        ]
    )
    session.commit()
    return real.id, virtual_a.id, virtual_b.id


def test_period_shows_one_row_per_virtual_code(client: TestClient, session: Session) -> None:
    _, virtual_a_id, virtual_b_id = _seed_virtual_codes(session)

    body = client.get("/api/period/2026-07-02").json()

    assert len(body["rows"]) == 2
    row_code_ids = {row["timesheet_code_id"] for row in body["rows"]}
    assert row_code_ids == {virtual_a_id, virtual_b_id}


def test_checklist_collapses_virtual_codes_into_real_code(client: TestClient, session: Session) -> None:
    real_id, _, _ = _seed_virtual_codes(session)

    body = client.get("/api/period/2026-07-02/checklist").json()

    assert body["total"] == 1
    item = body["items"][0]
    assert item["timesheet_code_id"] == real_id
    assert item["activity"] == "Bug fixing"
    assert item["day"] == 1
    assert item["minutes"] == 90


def test_checklist_items_match_nonempty_grid_cells(client: TestClient, session: Session) -> None:
    code_id = _seed(session)

    body = client.get("/api/period/2026-07-02/checklist").json()

    assert body["total"] == 2
    assert body["entered"] == 0
    cells = {(item["timesheet_code_id"], item["activity"], item["day"]) for item in body["items"]}
    assert cells == {(code_id, "Bug fixing", 1), (code_id, "Bug fixing", 2)}


def test_toggle_persists_and_updates_progress(client: TestClient, session: Session) -> None:
    code_id = _seed(session)

    response = client.patch(
        "/api/period/2026-07-02/checklist",
        json={"timesheet_code_id": code_id, "activity": "Bug fixing", "day": 1, "entered": True},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["entered"] == 1
    assert next(item for item in body["items"] if item["day"] == 1)["entered"] is True

    again = client.patch(
        "/api/period/2026-07-02/checklist",
        json={"timesheet_code_id": code_id, "activity": "Bug fixing", "day": 1, "entered": True},
    )
    assert again.json()["entered"] == 1


def test_reset_clears_all_marks(client: TestClient, session: Session) -> None:
    code_id = _seed(session)
    client.patch(
        "/api/period/2026-07-02/checklist",
        json={"timesheet_code_id": code_id, "activity": "Bug fixing", "day": 1, "entered": True},
    )

    response = client.delete("/api/period/2026-07-02/checklist")

    assert response.status_code == 200
    assert response.json()["entered"] == 0
