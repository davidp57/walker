"""The TimesheetCode model — a real T&E charge code, scoped to a user."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from walker.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from walker.models.activity import Activity


class TimesheetCode(TimestampMixin, Base):
    """A T&E Timesheet code (e.g. ``N9/1042``) with its per-code activities.

    Scoped to a ``user_id`` from day one (see ADR-0007). A code is either **real** (``real_code_id``
    is ``None`` — exists in T&E, imported) or **virtual** (Walker-only, ``real_code_id`` points at
    exactly one real code — see ADR-0008). ``number`` uniqueness applies to real codes only, enforced
    in the service layer (``services/catalog.py``); a virtual code is identified by its ``name``.
    """

    __tablename__ = "timesheet_codes"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    number: Mapped[str] = mapped_column(String(50))
    label: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(255))
    color: Mapped[str] = mapped_column(String(32))
    real_code_id: Mapped[int | None] = mapped_column(ForeignKey("timesheet_codes.id"), default=None, index=True)

    activities: Mapped[list[Activity]] = relationship(
        back_populates="timesheet_code",
        cascade="all, delete-orphan",
        order_by="Activity.code",
    )
    real_code: Mapped[TimesheetCode | None] = relationship(
        remote_side="TimesheetCode.id", back_populates="virtual_codes"
    )
    virtual_codes: Mapped[list[TimesheetCode]] = relationship(back_populates="real_code")

    @property
    def is_virtual(self) -> bool:
        """``True`` when this code is Walker-only, backed by a real T&E code (ADR-0008)."""
        return self.real_code_id is not None

    @property
    def resolved_number(self) -> str:
        """The T&E number: own for a real code, borrowed from the real code for a virtual one."""
        return self.real_code.number if self.real_code is not None else self.number

    @property
    def resolved_label(self) -> str:
        """The technical T&E label: own for a real code, borrowed for a virtual one."""
        return self.real_code.label if self.real_code is not None else self.label

    @property
    def resolved_activities(self) -> list[Activity]:
        """The Activities available: own for a real code, borrowed for a virtual one."""
        return self.real_code.activities if self.real_code is not None else self.activities
