"""Timer + entry domain logic — capture-first, real minutes (ADR-0005, ADR-0006).

Web-independent (must not import from ``walker.api``). The single running timer for a user is
the Entry whose ``end_minute`` is NULL; there is at most one at any time.
"""

from __future__ import annotations

from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from walker.exceptions import NotFoundError, ValidationError
from walker.models import Entry, Task
from walker.services import settings as settings_service
from walker.services import states


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


def _start_task_if_initial(session: Session, user_id: int, task_id: int | None) -> None:
    """Nudge a Task from its initial state to the next one when a Timer starts tracking it (BIZ-023).

    Positional (ADR-0011): a Task sitting in the **first** state moves to the **second**; any other
    state is left untouched — only the automatic initial -> next transition is triggered by starting
    a Timer (see lot TASKS PRD, Implementation Decisions).
    """
    if task_id is None:
        return
    task = session.get(Task, task_id)
    if task is None or task.user_id != user_id:
        raise NotFoundError(f"Task {task_id} not found.")
    task_states = settings_service.get_task_states(session, user_id)
    if task.status == states.initial_id(task_states):
        task.status = states.nudge_id(task_states)


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
    task_id: int | None = None,
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
        task_id=task_id,
        source="manual",  # BIZ-065: hand-composed, not timer-tracked.
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


def start_timer(session: Session, user_id: int, on_date: date, at_minute: int) -> Entry:
    """Open a running, uncategorized Entry. Rejects a second concurrent timer."""
    if running_entry(session, user_id) is not None:
        raise ValidationError("A timer is already running.")
    entry = Entry(user_id=user_id, date=on_date, start_minute=at_minute, source="timer")
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
    task_id: int | None = None,
) -> Entry:
    """Close the running Entry (if any) and open a new one, atomically in one commit.

    When ``task_id`` is given and the Task sits in its initial (first) state, it moves to the next
    state (BIZ-023, positional per ADR-0011) — the start-from-Task action for a fresh Task.
    """
    _start_task_if_initial(session, user_id, task_id)
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
        task_id=task_id,
        source="timer",  # BIZ-065: a switch opens a new timer segment.
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


def stop_timer(session: Session, user_id: int, at_minute: int) -> Entry:
    """Close the running Entry. Rejects when nothing is running. The linked Task's status, if any,
    is left unchanged (see ``complete_timer`` for the Stop | Complete split — BIZ-023)."""
    current = running_entry(session, user_id)
    if current is None:
        raise ValidationError("No timer is running.")
    current.end_minute = at_minute
    session.commit()
    session.refresh(current)
    return current


def complete_timer(session: Session, user_id: int, at_minute: int) -> Entry:
    """Close the running Entry and, when it is linked to a Task, mark that Task Done (BIZ-023).

    One call, one commit: stopping the Timer and completing its Task happen atomically, so there is
    no window where the Timer is stopped but the Task is not yet Done (or vice versa). A no-op on
    the Task when the running Entry carries none.
    """
    current = running_entry(session, user_id)
    if current is None:
        raise ValidationError("No timer is running.")
    current.end_minute = at_minute
    if current.task_id is not None:
        task = session.get(Task, current.task_id)
        if task is not None and task.user_id == user_id:
            task.status = states.terminal_id(settings_service.get_task_states(session, user_id))
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
