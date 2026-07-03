"""Settings + absences domain logic (BIZ-006).

Web-independent. Work rhythm is stored as a 7-char "0/1" string (Sun..Sat) and exposed as a
``list[bool]``. Absences are unique per date (re-adding a date updates its reason).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from walker.models import Absence, Settings
from walker.models.settings import DEFAULT_WORKDAYS


@dataclass
class SettingsView:
    """The settings as exposed to the API: work rhythm, density, and absences."""

    workdays: list[bool]
    density: str
    absences: list[Absence]


def _get_or_create(session: Session, user_id: int) -> Settings:
    settings = session.scalar(select(Settings).where(Settings.user_id == user_id))
    if settings is None:
        settings = Settings(user_id=user_id, workdays=DEFAULT_WORKDAYS, density="comfortable")
        session.add(settings)
        session.commit()
        session.refresh(settings)
    return settings


def _absences(session: Session, user_id: int) -> list[Absence]:
    return list(session.scalars(select(Absence).where(Absence.user_id == user_id).order_by(Absence.date)))


def _view(session: Session, user_id: int) -> SettingsView:
    settings = _get_or_create(session, user_id)
    return SettingsView(
        workdays=[char == "1" for char in settings.workdays],
        density=settings.density,
        absences=_absences(session, user_id),
    )


def get_settings(session: Session, user_id: int) -> SettingsView:
    """Return the user's settings, creating defaults on first use."""
    return _view(session, user_id)


def update_settings(session: Session, user_id: int, *, workdays: list[bool], density: str) -> SettingsView:
    """Persist the work rhythm + density."""
    settings = _get_or_create(session, user_id)
    settings.workdays = "".join("1" if worked else "0" for worked in workdays)
    settings.density = density
    session.commit()
    return _view(session, user_id)


def add_absence(session: Session, user_id: int, on: date, reason: str) -> SettingsView:
    """Add (or update the reason of) an absence for a date."""
    absence = session.scalar(select(Absence).where(Absence.user_id == user_id, Absence.date == on))
    if absence is None:
        session.add(Absence(user_id=user_id, date=on, reason=reason))
    else:
        absence.reason = reason
    session.commit()
    return _view(session, user_id)


def remove_absence(session: Session, user_id: int, on: date) -> SettingsView:
    """Remove an absence for a date (no-op if none)."""
    absence = session.scalar(select(Absence).where(Absence.user_id == user_id, Absence.date == on))
    if absence is not None:
        session.delete(absence)
        session.commit()
    return _view(session, user_id)
