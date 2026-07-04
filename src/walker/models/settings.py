"""The Settings model — per-user work rhythm, display density, and Timesheet period scheme
(BIZ-006, BIZ-027, ADR-0009).
"""

from __future__ import annotations

from typing import Literal

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from walker.models.base import Base, TimestampMixin

# Work rhythm as a 7-char "0/1" string, Sunday-first (Sun..Sat). Default: Mon–Fri worked.
DEFAULT_WORKDAYS = "0111110"

# The three fixed Timesheet period schemes (ADR-0009: no custom N-day cycles). "semi_monthly" is
# the 1st-15th / 16th-end-of-month split — Walker's original, still-default behavior.
PeriodScheme = Literal["weekly", "semi_monthly", "monthly"]
DEFAULT_PERIOD_SCHEME: PeriodScheme = "semi_monthly"


class Settings(TimestampMixin, Base):
    """A user's settings: which weekdays are workdays, the grid density, and the period scheme."""

    __tablename__ = "settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    workdays: Mapped[str] = mapped_column(String(7), default=DEFAULT_WORKDAYS)
    density: Mapped[str] = mapped_column(String(20), default="comfortable")
    period_scheme: Mapped[str] = mapped_column(String(20), default=DEFAULT_PERIOD_SCHEME)
