/** An activity label, as carried by an Entry / grid row (the label the user reads). */
export type ActivityName = string

/** A catalog activity: a Timesheet-system sub-code + its label. Belongs to one TimesheetCode (hierarchical). */
export interface Activity {
  code: string // Timesheet-system sub-code, e.g. "0001"
  label: string // e.g. "Bug fixing"
}

/**
 * A charge code. `number` is only needed for the Timesheet system; `name` (libellé) is the primary label.
 *
 * Either **real** (`isVirtual === false`, exists in the Timesheet system, imported) or **virtual** (Walker-only,
 * `realCodeId` points at exactly one real code — ADR-0008). `number`, `label`, and `activities` are
 * already resolved by the API: a virtual code's own for a real code, borrowed from its real code
 * otherwise — the SPA never needs to resolve them itself.
 */
export interface TimesheetCode {
  id: string
  number: string // e.g. "N9/1042"
  name: string // human project name (libellé), e.g. "Paper V4"
  label: string // technical Timesheet-system label, e.g. "MNT - PAP V4"
  color: string // accent dot color (hex)
  activities: Activity[] // this code's own activities (each code has its own list)
  isVirtual: boolean
  realCodeId: string | null // the backing real code, when this is a virtual code
  realCodeNumber: string | null // the backing real code's number, for display in the catalog
}

/** A code from the reference catalog — searched to add into your active codes. */
export interface ReferenceCode {
  id: string
  number: string
  name: string
  label: string
  activities: Activity[]
}

/** A tracked period of work. Can be uncategorized (codeId === null) and is always editable. */
export interface Entry {
  id: string
  date: string // ISO date "YYYY-MM-DD"
  start: number // minutes since midnight
  end: number | null // minutes since midnight; null = running timer
  codeId: string | null // null = uncategorized / needs completing
  activity: ActivityName | null // the chosen activity's label
  description: string
  taskId?: string | null // the Task this Entry was started from (BIZ-023), or null/absent
}

/** A non-worked day, reflected from the Timesheet system (read-only) or entered manually in the POC. */
export interface Absence {
  date: string // ISO date "YYYY-MM-DD"
  reason: string // "Annual leave", "Public holiday", ...
}

export type SemiMonthlyHalf = 'first' | 'second' // 1–15 | 16–end

/** The three fixed Timesheet period schemes a User can pick in Settings (ADR-0009). */
export type PeriodScheme = 'weekly' | 'semi_monthly' | 'monthly'

/** One day column in the Timesheet period/Checklist grid. */
export interface DayColumn {
  day: number // day-of-month
  weekday: string // "Mon", "Tue", ...
  isWeekend: boolean // non-working day (per work rhythm)
  isAbsence: boolean
  absenceReason?: string
  isToday: boolean
}

export type PeriodRowKey = string // `${codeId}|${activity}`

/** A Code × Activity row: minutes per day-of-month. */
export interface PeriodRow {
  key: PeriodRowKey
  code: TimesheetCode
  activity: ActivityName
  minutesByDay: Record<number, number>
}

/** Which grid cells have been keyed into the Timesheet system. Key = `${rowKey}#${day}`. */
export type ChecklistState = Record<string, boolean>

/** A previously-used task, surfaced as a comment-autocomplete suggestion. */
export interface TaskSuggestion {
  codeId: string | null
  codeNumber: string
  codeName: string
  activity: ActivityName | null
  description: string
  color: string
}

export type Density = 'comfortable' | 'compact'

/** A User's theme preference (ADAPTIVE lot); `"system"` follows the OS's `prefers-color-scheme`. */
export type Theme = 'dark' | 'light' | 'system'

/**
 * Per-user view preferences (BIZ-053): remembered screen state — the Tasks screen's view/group/sort
 * and the Timesheet period screen's mode and the kanban's collapsed-Done state. Distinct from the
 * deliberate {@link SettingsData}; keys mirror the API's snake_case contract.
 */
export interface ViewPreferences {
  task_view: 'list' | 'board'
  task_group: 'none' | 'status' | 'priority' | 'due' | 'code'
  task_sort: 'due' | 'status' | 'priority' | 'title'
  task_sort_dir: 'asc' | 'desc'
  period_mode: 'review' | 'enter'
  done_collapsed: boolean
}

/** The built-in view-preference defaults, mirroring the server's (services/settings.py). */
export const DEFAULT_VIEW_PREFERENCES: ViewPreferences = {
  task_view: 'list',
  task_group: 'none',
  task_sort: 'due',
  task_sort_dir: 'asc',
  period_mode: 'review',
  done_collapsed: false,
}

export const checklistKey = (rowKey: PeriodRowKey, day: number): string => `${rowKey}#${day}`

/**
 * A Task's status is an **opaque id** from the user's per-user, ordered state list (BIZ-056,
 * ADR-0011) — no longer a fixed enum. Roles are positional (first = initial, last = terminal), so
 * the UI reads order + labels from `TaskState[]`, never from hardcoded values.
 */
export type TaskStatus = string

/** One user-defined task state: an opaque stable id + an editable label (BIZ-056). */
export interface TaskState {
  id: string
  label: string
}

/** The five built-in defaults, for the first paint before the settings fetch resolves (BIZ-057). */
export const DEFAULT_TASK_STATES: TaskState[] = [
  { id: 'todo', label: 'To-do' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'waiting', label: 'Waiting' },
  { id: 'test', label: 'Test' },
  { id: 'done', label: 'Done' },
]

export type TaskPriority = 'low' | 'medium' | 'high'

/**
 * A recurring Task's rule (BIZ-025): completing a recurring Task rolls its due date forward and
 * resets its status to To-do (one live instance, no history). No RRULE/iCal — four simple kinds,
 * mirroring `services/recurrence.py`'s discriminated-union shape.
 */
export type RecurrenceRule =
  | { kind: 'every_n_days'; n: number }
  | { kind: 'weekly'; weekdays: number[] } // Monday=0 .. Sunday=6
  | { kind: 'monthly'; day: number } // day-of-month, clamped to shorter months
  | { kind: 'period_relative'; anchor: 'start' | 'end'; offsetDays: number }

/**
 * A Task: the persisted, metadata-rich form of a thing to do (see CONTEXT.md). Optionally linked to
 * a Timesheet code (real or virtual) — an orphan Task (`codeId === null`) is a normal, supported state.
 */
export interface Task {
  id: string
  title: string
  description: string // markdown, plain text for now (WYSIWYG editor lands in a later ticket)
  status: TaskStatus
  priority: TaskPriority | null
  dueDate: string | null // ISO date "YYYY-MM-DD"
  tags: string[]
  codeId: string | null
  recurrenceRule: RecurrenceRule | null
  createdAt: string // ISO datetime
  updatedAt: string // ISO datetime
}
