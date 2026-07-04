"""Seed the local dev database with a realistic demo dataset (idempotent).

Run once after ``alembic upgrade head`` so the app shows real content on every screen.
Uses the real current date so the Tracker/Timesheet period line up with what the SPA requests.
"""

from __future__ import annotations

from datetime import date

from walker.config import settings
from walker.db import SessionFactory
from walker.models import Absence, Activity, Entry, Settings, TimesheetCode, User


def main() -> None:
    session = SessionFactory()
    try:
        user = session.query(User).filter_by(username=settings.default_user).one_or_none()
        if user is None:
            user = User(username=settings.default_user)
            session.add(user)
            session.commit()
            session.refresh(user)

        if session.query(TimesheetCode).filter_by(user_id=user.id).first() is not None:
            print("Database already seeded — nothing to do.")
            return

        codes_data = [
            (
                "N9/1042",
                "MNT - PAP V4",
                "Paper V4",
                "#5b9cf6",
                [
                    ("0001", "Bug fixing"),
                    ("0002", "Change request"),
                    ("0003", "Communication & Meeting"),
                    ("0004", "Support"),
                ],
            ),
            (
                "N9/2318",
                "DEV - CLIENT PORTAL",
                "Client Portal",
                "#3fb68b",
                [("0001", "Bug fixing"), ("0002", "Change request"), ("0003", "Communication & Meeting")],
            ),
            (
                "N9/0007",
                "INT - INTERNAL / ADMIN",
                "Internal & Admin",
                "#c88b5b",
                [("0003", "Communication & Meeting"), ("0004", "Support")],
            ),
            (
                "N9/5501",
                "MNT - DATA PLATFORM",
                "Data Platform",
                "#a879d6",
                [("0001", "Bug fixing"), ("0002", "Change request")],
            ),
        ]
        codes: dict[str, TimesheetCode] = {}
        for number, label, name, color, acts in codes_data:
            code = TimesheetCode(
                user_id=user.id,
                number=number,
                label=label,
                name=name,
                color=color,
                activities=[Activity(code=ac, label=al) for ac, al in acts],
            )
            session.add(code)
            codes[number] = code
        session.commit()
        for code in codes.values():
            session.refresh(code)

        pap = codes["N9/1042"].id
        portal = codes["N9/2318"].id
        today = date.today()

        # Today's tracked entries (one still uncategorized, to show the "needs a code" flag).
        session.add_all(
            [
                Entry(
                    user_id=user.id,
                    date=today,
                    start_minute=542,
                    end_minute=588,
                    timesheet_code_id=pap,
                    activity="Communication & Meeting",
                    description="Daily stand-up + backlog grooming",
                ),
                Entry(
                    user_id=user.id,
                    date=today,
                    start_minute=588,
                    end_minute=675,
                    timesheet_code_id=pap,
                    activity="Bug fixing",
                    description="PAP V4 - fix date parsing on CSV import",
                ),
                Entry(
                    user_id=user.id,
                    date=today,
                    start_minute=680,
                    end_minute=725,
                    timesheet_code_id=portal,
                    activity="Change request",
                    description="Client portal - add CSV export button",
                ),
                Entry(
                    user_id=user.id,
                    date=today,
                    start_minute=850,
                    end_minute=875,
                    timesheet_code_id=None,
                    activity=None,
                    description="",
                ),
            ]
        )

        # Spread work across the first-half Timesheet period so the grid + checklist have content.
        for day in (1, 2, 3):
            day_date = today.replace(day=day)
            session.add(
                Entry(
                    user_id=user.id,
                    date=day_date,
                    start_minute=540,
                    end_minute=660,
                    timesheet_code_id=pap,
                    activity="Bug fixing",
                    description="PAP V4",
                )
            )
            session.add(
                Entry(
                    user_id=user.id,
                    date=day_date,
                    start_minute=780,
                    end_minute=840,
                    timesheet_code_id=portal,
                    activity="Change request",
                    description="Portal",
                )
            )

        if session.query(Settings).filter_by(user_id=user.id).first() is None:
            session.add(Settings(user_id=user.id))
        session.add(Absence(user_id=user.id, date=today.replace(day=14), reason="Annual leave"))
        session.commit()
        print("Seeded demo data (4 codes, today's entries, Timesheet period history, 1 absence).")
    finally:
        session.close()


if __name__ == "__main__":
    main()
