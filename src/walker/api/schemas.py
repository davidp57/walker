"""Pydantic schemas — the JSON contract exposed by the API (see ADR-0003)."""

from __future__ import annotations

import datetime
from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict

from walker.models.settings import PeriodScheme, Theme


class HealthResponse(BaseModel):
    """Liveness payload returned by ``GET /api/health``.

    ``auth_mode``/``sso_providers`` let the SPA decide, before calling any other endpoint, whether
    it needs to show a sign-in screen at all (ADR-0010) — this endpoint is always mounted,
    regardless of ``auth_mode``, unlike the ``/auth/*`` routes.
    """

    status: str
    version: str
    auth_mode: str
    sso_providers: list[str]


class CurrentUserRead(BaseModel):
    """The signed-in user, as returned by ``GET /api/auth/me`` (hosted/``sso`` deployments only)."""

    id: int
    email: str
    organization_id: int | None


class UserRead(BaseModel):
    """The current user, as returned by ``GET /api/user``."""

    model_config = ConfigDict(from_attributes=True)

    username: str
    name: str | None


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
    # T&E grid-ordering keys (BIZ-068), resolved virtual→real like number/label; null when the code
    # predates the enriched catalog import.
    customer: str | None = None
    type: str | None = None
    is_virtual: bool = False
    real_code_id: int | None = None
    real_code_number: str | None = None
    # BIZ-075 (ADR-0012): a hidden real code that exists only to back a virtual code. The SPA filters
    # these out of the catalog + pickers; the API still returns them so a checklist line's number/label
    # can be resolved by id.
    backing_only: bool = False


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
    """Pick a reference code (by number) to copy into the active codes.

    ``as_backing`` copies it as a hidden backing-only code for a virtual code (BIZ-075, ADR-0012).
    """

    number: str
    as_backing: bool = False


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
    task_id: int | None
    source: str | None  # "timer" | "manual" | None (legacy/unknown) — BIZ-065


class PeriodRowRead(BaseModel):
    """One Code × Activity row of the Timesheet period grid."""

    model_config = ConfigDict(from_attributes=True)

    timesheet_code_id: int
    activity: str
    minutes_by_day: dict[int, int]
    # BIZ-065: per-day flag — the cell aggregates at least one manually-added entry.
    manual_by_day: dict[int, bool]


class PeriodRead(BaseModel):
    """The aggregated Timesheet period grid returned by ``GET /api/period/{date}``."""

    model_config = ConfigDict(from_attributes=True)

    start: date
    end: date
    rows: list[PeriodRowRead]
    # BIZ-070: per-day minutes tracked but excluded from the matrix (missing a code or activity).
    uncategorized_by_day: dict[int, int]


class ChecklistItemRead(BaseModel):
    """One checklist line derived from a grid cell, with its entered state."""

    model_config = ConfigDict(from_attributes=True)

    timesheet_code_id: int
    activity: str
    day: int
    minutes: int
    entered: bool


class ChecklistRead(BaseModel):
    """The checklist for a Timesheet period, with progress counts."""

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
    """Optional categorization applied to the new Entry opened by a timer switch.

    ``task_id`` links the new Entry to the Task it was started from (BIZ-023) — set by the
    start-from-Task action; omitted (``None``) for a plain switch.
    """

    timesheet_code_id: int | None = None
    activity: str | None = None
    description: str | None = None
    task_id: int | None = None


class EntryCreate(BaseModel):
    """Create a completed Entry manually (no timer); missing fields get sensible defaults."""

    date: datetime.date | None = None
    start_minute: int | None = None
    end_minute: int | None = None
    timesheet_code_id: int | None = None
    activity: str | None = None
    description: str | None = None
    task_id: int | None = None


class EntryPatch(BaseModel):
    """Partial update of an Entry; only provided fields are changed."""

    date: datetime.date | None = None
    start_minute: int | None = None
    end_minute: int | None = None
    timesheet_code_id: int | None = None
    activity: str | None = None
    description: str | None = None
    task_id: int | None = None


class AbsenceRead(BaseModel):
    """A non-worked day."""

    model_config = ConfigDict(from_attributes=True)

    date: date
    reason: str


TaskView = Literal["list", "board"]
TaskGroup = Literal["none", "status", "priority", "due", "code"]
TaskSort = Literal["due", "status", "priority", "title"]
SortDir = Literal["asc", "desc"]
PeriodMode = Literal["review", "enter"]


class ViewPreferencesRead(BaseModel):
    """Per-user view preferences (BIZ-053) — always a full, resolved set."""

    model_config = ConfigDict(from_attributes=True)

    task_view: TaskView
    task_group: TaskGroup
    task_sort: TaskSort
    task_sort_dir: SortDir
    period_mode: PeriodMode
    done_collapsed: bool
    enter_rounding: bool


class ViewPreferencesUpdate(BaseModel):
    """Partial patch of view preferences — only the provided keys are merged (BIZ-053)."""

    task_view: TaskView | None = None
    task_group: TaskGroup | None = None
    task_sort: TaskSort | None = None
    task_sort_dir: SortDir | None = None
    period_mode: PeriodMode | None = None
    done_collapsed: bool | None = None
    enter_rounding: bool | None = None


class TaskStateRead(BaseModel):
    """One user-defined task state: an opaque stable id + an editable label (BIZ-056, ADR-0011)."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    label: str


class SettingsRead(BaseModel):
    """The user's settings: work rhythm (Sun..Sat), density, period scheme, theme, absences, the
    per-user view preferences (BIZ-053), and the ordered task-state list (BIZ-056).
    """

    model_config = ConfigDict(from_attributes=True)

    workdays: list[bool]
    density: str
    period_scheme: PeriodScheme
    theme: Theme
    absences: list[AbsenceRead]
    view_preferences: ViewPreferencesRead
    task_states: list[TaskStateRead]


class TaskStateAdd(BaseModel):
    """Payload to add a task state (inserted before the terminal one)."""

    label: str


class TaskStateRename(BaseModel):
    """Payload to rename a task state (label only — its id, and Tasks, are untouched)."""

    label: str


class TaskStateReorder(BaseModel):
    """Payload to reorder the task states — a permutation of every existing state id."""

    ordered_ids: list[str]


class SettingsUpdate(BaseModel):
    """Payload to update the work rhythm, density, and (optionally) the period scheme/theme."""

    workdays: list[bool]
    density: str
    period_scheme: PeriodScheme | None = None
    theme: Theme | None = None


class AbsenceWrite(BaseModel):
    """Payload to add/update an absence.

    ``end`` is optional: when omitted (or equal to ``date``) a single day is added; when set it adds
    one absence per day across the inclusive range ``[date, end]`` (BIZ-039).
    """

    # Qualified `datetime.date` avoids the field name `date` shadowing the type in this class scope.
    date: datetime.date
    end: datetime.date | None = None
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
    recurrence_rule: dict[str, object] | None
    created_at: datetime.datetime
    updated_at: datetime.datetime


class TaskCreate(BaseModel):
    """Payload to create a Task. Only ``title`` is required; an orphan Task has no code.

    ``recurrence_rule`` is one of the shapes documented in ``services/recurrence.py``, e.g.
    ``{"kind": "every_n_days", "n": 3}``, ``{"kind": "weekly", "weekdays": [0, 2, 4]}``,
    ``{"kind": "monthly", "day": 15}``, or
    ``{"kind": "period_relative", "anchor": "end", "offset_days": -1}``.
    """

    title: str
    description: str | None = None
    # A task-state id from the user's list (BIZ-056); null defaults to their first (initial) state.
    status: str | None = None
    priority: str | None = None
    due_date: date | None = None
    tags: list[str] = []
    timesheet_code_id: int | None = None
    recurrence_rule: dict[str, object] | None = None


class TaskUpdate(BaseModel):
    """Payload to update a Task (same shape as create — all fields are replaced)."""

    title: str
    description: str | None = None
    # A task-state id from the user's list (BIZ-056); null defaults to their first (initial) state.
    status: str | None = None
    priority: str | None = None
    due_date: date | None = None
    tags: list[str] = []
    timesheet_code_id: int | None = None
    recurrence_rule: dict[str, object] | None = None
