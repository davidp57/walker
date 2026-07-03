"""Pydantic schemas — the JSON contract exposed by the API (see ADR-0003)."""

from __future__ import annotations

import datetime
from datetime import date

from pydantic import BaseModel, ConfigDict


class HealthResponse(BaseModel):
    """Liveness payload returned by ``GET /api/health``."""

    status: str
    version: str


class ActivityRead(BaseModel):
    """An activity (sub-code) nested under a code in the catalog."""

    model_config = ConfigDict(from_attributes=True)

    code: str
    label: str


class CodeRead(BaseModel):
    """A Timesheet code with its activities, as returned by ``GET /api/codes``.

    ``number``, ``label``, and ``activities`` are the *resolved* values: a virtual code's own for a
    real code, borrowed from its real code otherwise (ADR-0008).
    """

    id: int
    number: str
    label: str
    name: str
    color: str
    activities: list[ActivityRead]
    is_virtual: bool = False
    real_code_id: int | None = None
    real_code_number: str | None = None


class ActivityWrite(BaseModel):
    """An activity as supplied when creating/updating a code."""

    code: str
    label: str


class CodeCreate(BaseModel):
    """Payload to create a code. ``name`` defaults to ``label``; ``color`` is auto-assigned."""

    number: str
    label: str
    name: str | None = None
    color: str | None = None
    activities: list[ActivityWrite] = []


class CodeUpdate(CodeCreate):
    """Payload to update a code (same shape as create; activities are replaced)."""


class VirtualCodeCreate(BaseModel):
    """Payload to create a virtual code: name + colour + the real code it resolves to (ADR-0008)."""

    real_code_id: int
    name: str
    color: str | None = None


class VirtualCodeUpdate(BaseModel):
    """Payload to update a virtual code (same shape as create)."""

    real_code_id: int
    name: str
    color: str | None = None


class ImportSummary(BaseModel):
    """Result of a catalog import: how many codes were created vs updated."""

    created: int
    updated: int


class ReferenceCodeRead(BaseModel):
    """A code from the reference catalog, returned by the autocomplete search."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    number: str
    label: str
    name: str
    activities: list[ActivityRead]


class AddFromReference(BaseModel):
    """Pick a reference code (by number) to copy into the active codes."""

    number: str


class EntryRead(BaseModel):
    """A tracked Entry. ``end_minute`` NULL means the timer is still running."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    date: date
    start_minute: int
    end_minute: int | None
    timesheet_code_id: int | None
    activity: str | None
    description: str | None


class FortnightRowRead(BaseModel):
    """One Code × Activity row of the fortnight grid."""

    model_config = ConfigDict(from_attributes=True)

    timesheet_code_id: int
    activity: str
    minutes_by_day: dict[int, int]


class FortnightRead(BaseModel):
    """The aggregated fortnight grid returned by ``GET /api/fortnight/{date}``."""

    model_config = ConfigDict(from_attributes=True)

    start: date
    end: date
    rows: list[FortnightRowRead]


class ChecklistItemRead(BaseModel):
    """One checklist line derived from a grid cell, with its entered state."""

    model_config = ConfigDict(from_attributes=True)

    timesheet_code_id: int
    activity: str
    day: int
    minutes: int
    entered: bool


class ChecklistRead(BaseModel):
    """The checklist for a fortnight, with progress counts."""

    model_config = ConfigDict(from_attributes=True)

    items: list[ChecklistItemRead]
    entered: int
    total: int


class ChecklistToggle(BaseModel):
    """Set the entered state of one ``(code, activity, day)`` checklist cell."""

    timesheet_code_id: int
    activity: str
    day: int
    entered: bool


class TimerSwitch(BaseModel):
    """Optional categorization applied to the new Entry opened by a timer switch."""

    timesheet_code_id: int | None = None
    activity: str | None = None
    description: str | None = None


class EntryCreate(BaseModel):
    """Create a completed Entry manually (no timer); missing fields get sensible defaults."""

    date: datetime.date | None = None
    start_minute: int | None = None
    end_minute: int | None = None
    timesheet_code_id: int | None = None
    activity: str | None = None
    description: str | None = None


class EntryPatch(BaseModel):
    """Partial update of an Entry; only provided fields are changed."""

    date: datetime.date | None = None
    start_minute: int | None = None
    end_minute: int | None = None
    timesheet_code_id: int | None = None
    activity: str | None = None
    description: str | None = None


class AbsenceRead(BaseModel):
    """A non-worked day."""

    model_config = ConfigDict(from_attributes=True)

    date: date
    reason: str


class SettingsRead(BaseModel):
    """The user's settings: work rhythm (Sun..Sat), density, and absences."""

    model_config = ConfigDict(from_attributes=True)

    workdays: list[bool]
    density: str
    absences: list[AbsenceRead]


class SettingsUpdate(BaseModel):
    """Payload to update the work rhythm and density."""

    workdays: list[bool]
    density: str


class AbsenceWrite(BaseModel):
    """Payload to add/update an absence."""

    date: date
    reason: str


class TaskRead(BaseModel):
    """A Task, as returned by the ``/api/tasks`` endpoints."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None
    status: str
    priority: str | None
    due_date: date | None
    tags: list[str]
    timesheet_code_id: int | None
    created_at: datetime.datetime
    updated_at: datetime.datetime


class TaskCreate(BaseModel):
    """Payload to create a Task. Only ``title`` is required; an orphan Task has no code."""

    title: str
    description: str | None = None
    status: str = "todo"
    priority: str | None = None
    due_date: date | None = None
    tags: list[str] = []
    timesheet_code_id: int | None = None


class TaskUpdate(BaseModel):
    """Payload to update a Task (same shape as create — all fields are replaced)."""

    title: str
    description: str | None = None
    status: str = "todo"
    priority: str | None = None
    due_date: date | None = None
    tags: list[str] = []
    timesheet_code_id: int | None = None
