"""Timer + entry domain logic — capture-first, real minutes (ADR-0005, ADR-0006).

Web-independent (must not import from ``walker.api``). The single running timer for a user is
the Entry whose ``end_minute`` is NULL; there is at most one at any time.
"""

from __future__ import annotations

from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from walker.exceptions import NotFoundError, ValidationError
from walker.models import Entry


def running_entry(session: Session, user_id: int) -> Entry | None:
    """Return the user's running Entry (``end_minute`` NULL), or ``None``."""
    return session.scalar(select(Entry).where(Entry.user_id == user_id, Entry.end_minute.is_(None)))


def list_entries(session: Session, user_id: int, on_date: date) -> list[Entry]:
    """Return the user's entries for ``on_date``, ordered by start time."""
    return list(
        session.scalars(
            select(Entry).where(Entry.user_id == user_id, Entry.date == on_date).order_by(Entry.start_minute)
        )
    )


def list_entries_range(session: Session, user_id: int, start: date, end: date) -> list[Entry]:
    """Return the user's entries between ``start`` and ``end`` (inclusive), by day then start time."""
    return list(
        session.scalars(
            select(Entry)
            .where(Entry.user_id == user_id, Entry.date >= start, Entry.date <= end)
            .order_by(Entry.date, Entry.start_minute)
        )
    )


def create_entry(
    session: Session,
    user_id: int,
    *,
    on_date: date,
    start_minute: int,
    end_minute: int | None,
    timesheet_code_id: int | None = None,
    activity: str | None = None,
    description: str | None = None,
) -> Entry:
    """Create an Entry directly (no timer) — e.g. a past or future manual entry."""
    entry = Entry(
        user_id=user_id,
        date=on_date,
        start_minute=start_minute,
        end_minute=end_minute,
        timesheet_code_id=timesheet_code_id,
        activity=activity,
        description=description,
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


def start_timer(session: Session, user_id: int, on_date: date, at_minute: int) -> Entry:
    """Open a running, uncategorized Entry. Rejects a second concurrent timer."""
    if running_entry(session, user_id) is not None:
        raise ValidationError("A timer is already running.")
    entry = Entry(user_id=user_id, date=on_date, start_minute=at_minute)
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


def switch_timer(
    session: Session,
    user_id: int,
    on_date: date,
    at_minute: int,
    *,
    timesheet_code_id: int | None = None,
    activity: str | None = None,
    description: str | None = None,
) -> Entry:
    """Close the running Entry (if any) and open a new one, atomically in one commit."""
    current = running_entry(session, user_id)
    if current is not None:
        current.end_minute = at_minute
    entry = Entry(
        user_id=user_id,
        date=on_date,
        start_minute=at_minute,
        timesheet_code_id=timesheet_code_id,
        activity=activity,
        description=description,
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


def stop_timer(session: Session, user_id: int, at_minute: int) -> Entry:
    """Close the running Entry. Rejects when nothing is running."""
    current = running_entry(session, user_id)
    if current is None:
        raise ValidationError("No timer is running.")
    current.end_minute = at_minute
    session.commit()
    session.refresh(current)
    return current


def stop_all_running(session: Session, at_minute: int) -> int:
    """Close every running Entry (e.g. on server shutdown). Returns how many were closed."""
    running = session.scalars(select(Entry).where(Entry.end_minute.is_(None))).all()
    for entry in running:
        entry.end_minute = max(entry.start_minute, at_minute)
    session.commit()
    return len(running)


def get_entry(session: Session, user_id: int, entry_id: int) -> Entry:
    """Return the user's Entry or raise ``NotFoundError``."""
    entry = session.get(Entry, entry_id)
    if entry is None or entry.user_id != user_id:
        raise NotFoundError(f"Entry {entry_id} not found.")
    return entry


def patch_entry(session: Session, user_id: int, entry_id: int, fields: dict[str, object]) -> Entry:
    """Update the given Entry fields (durations preserved to the minute)."""
    entry = get_entry(session, user_id, entry_id)
    for key, value in fields.items():
        setattr(entry, key, value)
    session.commit()
    session.refresh(entry)
    return entry


def delete_entry(session: Session, user_id: int, entry_id: int) -> None:
    """Delete the user's Entry."""
    entry = get_entry(session, user_id, entry_id)
    session.delete(entry)
    session.commit()
