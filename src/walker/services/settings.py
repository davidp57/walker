"""Settings + absences domain logic (BIZ-006, BIZ-027, BIZ-031).

Web-independent. Work rhythm is stored as a 7-char "0/1" string (Sun..Sat) and exposed as a
``list[bool]``. Absences are unique per date (re-adding a date updates its reason). ``period_scheme``
drives the Timesheet period computation in ``services/period.py`` (ADR-0009). ``theme`` is the
user's dark/light/system preference (ADAPTIVE lot); ``resolve_theme`` turns it into an actual
rendered value.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Literal

from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from walker.exceptions import ValidationError
from walker.models import Absence, Settings, Task
from walker.models.settings import DEFAULT_PERIOD_SCHEME, DEFAULT_THEME, DEFAULT_WORKDAYS, PeriodScheme, Theme
from walker.services import states

# A single add-absence call may not span more than this many days (BIZ-039) — a guard against a
# fat-fingered range, not a real limit anyone would hit for leave.
MAX_ABSENCE_RANGE_DAYS = 366

# View preferences (BIZ-053): ephemeral per-screen UI state remembered per user, stored as a JSON
# bag so new prefs need no migration. Each enum key lists its allowed values; ``done_collapsed`` is
# a bool. Reads always resolve to a full, valid set (invalid/missing → default), mirroring the
# forgiving ``_as_theme``/``_as_period_scheme`` handling.
VIEW_PREFERENCE_OPTIONS: dict[str, tuple[str, ...]] = {
    "task_view": ("list", "board"),
    "task_group": ("none", "status", "priority", "due", "code"),
    "task_sort": ("due", "status", "priority", "title"),
    "task_sort_dir": ("asc", "desc"),
    "period_mode": ("review", "enter"),
}
DEFAULT_VIEW_PREFERENCES: dict[str, object] = {
    "task_view": "list",
    "task_group": "none",
    "task_sort": "due",
    "task_sort_dir": "asc",
    "period_mode": "review",
    "done_collapsed": False,
}


def _resolve_view_preferences(stored: dict[str, object] | None) -> dict[str, object]:
    """Merge the stored bag over the defaults, dropping any invalid/unknown value to its default."""
    stored = stored or {}
    resolved = dict(DEFAULT_VIEW_PREFERENCES)
    for key, options in VIEW_PREFERENCE_OPTIONS.items():
        value = stored.get(key)
        if isinstance(value, str) and value in options:
            resolved[key] = value
    done = stored.get("done_collapsed")
    if isinstance(done, bool):
        resolved["done_collapsed"] = done
    return resolved


def _clean_view_preferences_patch(patch: dict[str, object]) -> dict[str, object]:
    """Keep only known keys with valid values from a partial patch — unknown/invalid are dropped."""
    cleaned: dict[str, object] = {}
    for key, options in VIEW_PREFERENCE_OPTIONS.items():
        value = patch.get(key)
        if isinstance(value, str) and value in options:
            cleaned[key] = value
    done = patch.get("done_collapsed")
    if isinstance(done, bool):
        cleaned["done_collapsed"] = done
    return cleaned


@dataclass
class SettingsView:
    """The settings as exposed to the API: work rhythm, density, period scheme, theme, and
    absences.
    """

    workdays: list[bool]
    density: str
    period_scheme: PeriodScheme
    theme: Theme
    absences: list[Absence]
    view_preferences: dict[str, object]
    task_states: list[dict[str, str]]


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
        theme=DEFAULT_THEME,
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


def _as_theme(value: str) -> Theme:
    if value in ("dark", "light", "system"):
        return value  # type: ignore[return-value]
    return DEFAULT_THEME


def resolve_theme(preference: Theme, prefers_dark: bool) -> Literal["dark", "light"]:
    """Resolve a theme preference to an actual dark/light value.

    ``"system"`` defers to ``prefers_dark`` (the browser's ``prefers-color-scheme``); ``"dark"``/
    ``"light"`` always win outright regardless of ``prefers_dark``. Pure function, no DOM/DB access.
    """
    if preference == "system":
        return "dark" if prefers_dark else "light"
    return preference


def _view(session: Session, user_id: int) -> SettingsView:
    settings = _get_or_create(session, user_id)
    return SettingsView(
        workdays=[char == "1" for char in settings.workdays],
        density=settings.density,
        period_scheme=_as_period_scheme(settings.period_scheme),
        theme=_as_theme(settings.theme),
        absences=_absences(session, user_id),
        view_preferences=_resolve_view_preferences(settings.view_preferences),
        task_states=states.resolve_states(settings.task_states),
    )


def get_settings(session: Session, user_id: int) -> SettingsView:
    """Return the user's settings, creating defaults on first use."""
    return _view(session, user_id)


def get_task_states(session: Session, user_id: int) -> list[dict[str, str]]:
    """Return the user's ordered task-state list, resolved to the defaults on first use (BIZ-056)."""
    return states.resolve_states(_get_or_create(session, user_id).task_states)


def add_task_state(session: Session, user_id: int, label: str) -> SettingsView:
    """Add a state, inserted before the terminal one (ADR-0011); returns the full settings view."""
    settings = _get_or_create(session, user_id)
    settings.task_states = states.add_state(states.resolve_states(settings.task_states), label)
    session.commit()
    return _view(session, user_id)


def rename_task_state(session: Session, user_id: int, state_id: str, label: str) -> SettingsView:
    """Rename a state's label (its id is untouched, so Tasks are never re-tagged)."""
    settings = _get_or_create(session, user_id)
    settings.task_states = states.rename_state(states.resolve_states(settings.task_states), state_id, label)
    session.commit()
    return _view(session, user_id)


def reorder_task_states(session: Session, user_id: int, ordered_ids: list[str]) -> SettingsView:
    """Reorder the states to ``ordered_ids`` (a permutation) — re-pointing the initial/terminal roles."""
    settings = _get_or_create(session, user_id)
    settings.task_states = states.reorder_states(states.resolve_states(settings.task_states), ordered_ids)
    session.commit()
    return _view(session, user_id)


def delete_task_state(session: Session, user_id: int, state_id: str, reassign_to: str | None = None) -> SettingsView:
    """Delete a state (blocked at the 2-state minimum, ADR-0011).

    A non-empty state's Tasks must be reassigned to a chosen, still-existing target; an empty state
    deletes outright (``reassign_to`` ignored).
    """
    settings = _get_or_create(session, user_id)
    current = states.resolve_states(settings.task_states)
    remaining = states.delete_state(current, state_id)  # raises on unknown id / below the minimum
    in_use = session.scalar(
        select(func.count()).select_from(Task).where(Task.user_id == user_id, Task.status == state_id)
    )
    if in_use:
        if reassign_to is None or reassign_to == state_id or reassign_to not in states.state_ids(remaining):
            raise ValidationError("Deleting a non-empty state requires a valid target state to reassign its tasks to.")
        session.execute(update(Task).where(Task.user_id == user_id, Task.status == state_id).values(status=reassign_to))
    settings.task_states = remaining
    session.commit()
    return _view(session, user_id)


def update_settings(
    session: Session,
    user_id: int,
    *,
    workdays: list[bool],
    density: str,
    period_scheme: PeriodScheme | None = None,
    theme: Theme | None = None,
) -> SettingsView:
    """Persist the work rhythm, density, and (optionally) the Timesheet period scheme/theme."""
    settings = _get_or_create(session, user_id)
    settings.workdays = "".join("1" if worked else "0" for worked in workdays)
    settings.density = density
    if period_scheme is not None:
        settings.period_scheme = period_scheme
    if theme is not None:
        settings.theme = theme
    session.commit()
    return _view(session, user_id)


def update_view_preferences(session: Session, user_id: int, patch: dict[str, object]) -> SettingsView:
    """Merge a partial, validated view-preferences patch into the user's stored bag (BIZ-053)."""
    settings = _get_or_create(session, user_id)
    merged = dict(settings.view_preferences or {})
    merged.update(_clean_view_preferences_patch(patch))
    settings.view_preferences = merged
    session.commit()
    return _view(session, user_id)


def _upsert_absence(session: Session, user_id: int, on: date, reason: str) -> None:
    """Add or update a single day's absence, without committing."""
    absence = session.scalar(select(Absence).where(Absence.user_id == user_id, Absence.date == on))
    if absence is None:
        session.add(Absence(user_id=user_id, date=on, reason=reason))
    else:
        absence.reason = reason


def add_absence(session: Session, user_id: int, on: date, reason: str, end: date | None = None) -> SettingsView:
    """Add (or update the reason of) an absence over ``[on, end]`` inclusive (BIZ-039).

    ``end`` defaults to ``on`` (a single day). Every calendar day in the range gets its own row
    (weekends included), upserting per date so re-posting an overlapping range is idempotent. Raises
    ``ValidationError`` if ``end`` precedes ``on`` or the range is unreasonably long.
    """
    last = end if end is not None else on
    if last < on:
        raise ValidationError(f"Absence end {last} is before start {on}.")
    if (last - on).days + 1 > MAX_ABSENCE_RANGE_DAYS:
        raise ValidationError(f"Absence range is longer than {MAX_ABSENCE_RANGE_DAYS} days.")
    day = on
    while day <= last:
        _upsert_absence(session, user_id, day, reason)
        day += timedelta(days=1)
    session.commit()
    return _view(session, user_id)


def remove_absence(session: Session, user_id: int, on: date) -> SettingsView:
    """Remove an absence for a date (no-op if none)."""
    absence = session.scalar(select(Absence).where(Absence.user_id == user_id, Absence.date == on))
    if absence is not None:
        session.delete(absence)
        session.commit()
    return _view(session, user_id)
