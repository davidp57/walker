"""Tests for the Timesheet period endpoint (BIZ-004, BIZ-027)."""

from __future__ import annotations

from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from walker.config import settings
from walker.models import Entry, TimesheetCode, User


def test_period_returns_aggregated_grid(client: TestClient, session: Session) -> None:
    user = User(username=settings.default_user)
    session.add(user)
    session.commit()
    session.refresh(user)
    code = TimesheetCode(user_id=user.id, number="N9/1", label="L", name="Paper", color="#111")
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
                date=date(2026, 7, 1),
                start_minute=600,
                end_minute=630,
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
            # Completed but missing an activity → uncategorized, not on the matrix (BIZ-070).
            Entry(
                user_id=user.id,
                date=date(2026, 7, 2),
                start_minute=600,
                end_minute=660,
                timesheet_code_id=code.id,
                activity=None,
            ),
        ]
    )
    session.commit()

    response = client.get("/api/period/2026-07-02")

    assert response.status_code == 200
    body = response.json()
    assert body["start"] == "2026-07-01"
    assert body["end"] == "2026-07-15"
    assert len(body["rows"]) == 1
    row = body["rows"][0]
    assert row["timesheet_code_id"] == code.id
    assert row["activity"] == "Bug fixing"
    assert row["minutes_by_day"] == {"1": 90, "2": 60}
    assert body["uncategorized_by_day"] == {"2": 60}


def test_period_reshapes_per_settings_scheme(client: TestClient, session: Session) -> None:
    user = User(username=settings.default_user)
    session.add(user)
    session.commit()
    session.refresh(user)
    code = TimesheetCode(user_id=user.id, number="N9/1", label="L", name="Paper", color="#111")
    session.add(code)
    session.commit()
    session.refresh(code)
    session.add(
        Entry(
            user_id=user.id,
            date=date(2026, 7, 1),
            start_minute=540,
            end_minute=600,
            timesheet_code_id=code.id,
            activity="Bug fixing",
        )
    )
    session.commit()

    client.put(
        "/api/settings",
        json={
            "workdays": [False, True, True, True, True, True, False],
            "density": "comfortable",
            "period_scheme": "monthly",
        },
    )

    response = client.get("/api/period/2026-07-15")

    assert response.status_code == 200
    body = response.json()
    assert body["start"] == "2026-07-01"
    assert body["end"] == "2026-07-31"
