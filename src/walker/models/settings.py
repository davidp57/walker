"""The Settings model — per-user work rhythm, display density, and Timesheet period scheme
(BIZ-006, BIZ-027, ADR-0009).
"""

from __future__ import annotations

from typing import Literal

from sqlalchemy import JSON, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from walker.models.base import Base, TimestampMixin

# Work rhythm as a 7-char "0/1" string, Sunday-first (Sun..Sat). Default: Mon–Fri worked.
DEFAULT_WORKDAYS = "0111110"

# The three fixed Timesheet period schemes (ADR-0009: no custom N-day cycles). "semi_monthly" is
# the 1st-15th / 16th-end-of-month split — Walker's original, still-default behavior.
PeriodScheme = Literal["weekly", "semi_monthly", "monthly"]
DEFAULT_PERIOD_SCHEME: PeriodScheme = "semi_monthly"

# The theme preference: "system" follows the OS's prefers-color-scheme; "dark"/"light" are explicit
# overrides (ADAPTIVE lot, theme toggle).
Theme = Literal["dark", "light", "system"]
DEFAULT_THEME: Theme = "system"


class Settings(TimestampMixin, Base):
    """A user's settings: which weekdays are workdays, the grid density, the period scheme, and the
    theme preference.
    """

    __tablename__ = "settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    workdays: Mapped[str] = mapped_column(String(7), default=DEFAULT_WORKDAYS)
    density: Mapped[str] = mapped_column(String(20), default="comfortable")
    period_scheme: Mapped[str] = mapped_column(String(20), default=DEFAULT_PERIOD_SCHEME)
    theme: Mapped[str] = mapped_column(String(20), default=DEFAULT_THEME)
    # BIZ-053: per-user view preferences (task view/group/sort, period mode, Done collapse) as a JSON
    # bag — ephemeral screen state remembered per user, distinct from the deliberate settings above.
    view_preferences: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)
    # BIZ-056 (ADR-0011): the user's ordered task-state list (each {"id", "label"}); empty resolves to
    # the five defaults in `services/states`. Configuration data (Tasks reference the ids), distinct
    # from the ephemeral view_preferences above though both use JSON storage.
    task_states: Mapped[list[dict[str, str]]] = mapped_column(JSON, default=list)
