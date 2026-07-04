"""Settings + absences domain logic (BIZ-006, BIZ-027).

Web-independent. Work rhythm is stored as a 7-char "0/1" string (Sun..Sat) and exposed as a
``list[bool]``. Absences are unique per date (re-adding a date updates its reason). ``period_scheme``
drives the Timesheet period computation in ``services/period.py`` (ADR-0009).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from walker.models import Absence, Settings
from walker.models.settings import DEFAULT_PERIOD_SCHEME, DEFAULT_WORKDAYS, PeriodScheme


@dataclass
class SettingsView:
    """The settings as exposed to the API: work rhythm, density, period scheme, and absences."""

    workdays: list[bool]
    density: str
    period_scheme: PeriodScheme
    absences: list[Absence]


def _get_or_create(session: Session, user_id: int) -> Settings:
    """Find or create the user's ``Settings`` row, tolerating a concurrent create for the same user.

    Two requests can both see no row yet (e.g. the several boot-time API calls the SPA fires in
    parallel, for a User signing in for the very first time) and both try to insert one — the
    loser hits ``settings.user_id``'s unique constraint instead of a normal race-free get. Rather
    than 500 in that case, roll back and re-fetch the winner's row.
    """
    settings = session.scalar(select(Settings).where(Settings.user_id == user_id))
    if settings is not None:
        return settings

    settings = Settings(
        user_id=user_id,
        workdays=DEFAULT_WORKDAYS,
        density="comfortable",
        period_scheme=DEFAULT_PERIOD_SCHEME,
    )
    session.add(settings)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        settings = session.scalar(select(Settings).where(Settings.user_id == user_id))
        if settings is None:
            raise
    else:
        session.refresh(settings)
    return settings


def _absences(session: Session, user_id: int) -> list[Absence]:
    return list(session.scalars(select(Absence).where(Absence.user_id == user_id).order_by(Absence.date)))


def _as_period_scheme(value: str) -> PeriodScheme:
    if value in ("weekly", "semi_monthly", "monthly"):
        return value  # type: ignore[return-value]
    return DEFAULT_PERIOD_SCHEME


def _view(session: Session, user_id: int) -> SettingsView:
    settings = _get_or_create(session, user_id)
    return SettingsView(
        workdays=[char == "1" for char in settings.workdays],
        density=settings.density,
        period_scheme=_as_period_scheme(settings.period_scheme),
        absences=_absences(session, user_id),
    )


def get_settings(session: Session, user_id: int) -> SettingsView:
    """Return the user's settings, creating defaults on first use."""
    return _view(session, user_id)


def update_settings(
    session: Session,
    user_id: int,
    *,
    workdays: list[bool],
    density: str,
    period_scheme: PeriodScheme | None = None,
) -> SettingsView:
    """Persist the work rhythm, density, and (optionally) the Timesheet period scheme."""
    settings = _get_or_create(session, user_id)
    settings.workdays = "".join("1" if worked else "0" for worked in workdays)
    settings.density = density
    if period_scheme is not None:
        settings.period_scheme = period_scheme
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
