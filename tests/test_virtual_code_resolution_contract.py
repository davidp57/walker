"""Contract test (TEC-004): backend/frontend virtual-code resolution must stay in sync.

ADR-0008's "resolve virtual code -> real code" rule is implemented independently in
``walker.services.period.resolve_to_real_codes`` and in the frontend's
``frontend/src/lib/checklist.ts::resolveChecklistRows`` (kept separate because the frontend also
folds in the live running-timer cell, which the server cannot know about). Both consumers assert
against the same fixture in ``tests/fixtures/virtual_code_resolution.json`` so a change to one rule
that isn't mirrored in the other fails a test instead of silently diverging.
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

from sqlalchemy.orm import Session

from walker.models import TimesheetCode, User
from walker.services.period import PeriodGrid, PeriodRow, resolve_to_real_codes

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "virtual_code_resolution.json"


def _load_fixture() -> dict[str, object]:
    return json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))


def test_fixture_matches_backend_resolution(session: Session) -> None:
    """`resolve_to_real_codes` must reproduce the fixture's `expected_resolved_rows` exactly."""
    fixture = _load_fixture()

    user = User(username="me")
    session.add(user)
    session.commit()
    session.refresh(user)

    codes = fixture["codes"]
    assert isinstance(codes, list)
    id_by_fixture_id: dict[int, int] = {}
    # Real codes (real_code_id is None) must be created before the virtuals that reference them.
    for entry in sorted(codes, key=lambda c: c["real_code_id"] is not None):
        real_fixture_id = entry["real_code_id"]
        code = TimesheetCode(
            user_id=user.id,
            number="N9/1",
            label="L",
            name=f"code-{entry['id']}",
            color="#111",
            real_code_id=id_by_fixture_id[real_fixture_id] if real_fixture_id is not None else None,
        )
        session.add(code)
        session.commit()
        session.refresh(code)
        id_by_fixture_id[entry["id"]] = code.id

    rows_fixture = fixture["rows"]
    assert isinstance(rows_fixture, list)
    rows = [
        PeriodRow(
            timesheet_code_id=id_by_fixture_id[row["timesheet_code_id"]],
            activity=row["activity"],
            minutes_by_day={int(day): minutes for day, minutes in row["minutes_by_day"].items()},
        )
        for row in rows_fixture
    ]
    grid = PeriodGrid(start=date(2026, 7, 1), end=date(2026, 7, 15), rows=rows)

    resolved = resolve_to_real_codes(session, grid)

    actual = {(row.timesheet_code_id, row.activity): row.minutes_by_day for row in resolved.rows}
    expected_fixture = fixture["expected_resolved_rows"]
    assert isinstance(expected_fixture, list)
    expected = {
        (id_by_fixture_id[row["timesheet_code_id"]], row["activity"]): {
            int(day): minutes for day, minutes in row["minutes_by_day"].items()
        }
        for row in expected_fixture
    }
    assert actual == expected
