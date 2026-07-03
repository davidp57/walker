/** An activity label, as carried by an Entry / grid row (the label the user reads). */
export type ActivityName = string

/** A catalog activity: a T&E sub-code + its label. Belongs to one TimesheetCode (hierarchical). */
export interface Activity {
  code: string // T&E sub-code, e.g. "0001"
  label: string // e.g. "Bug fixing"
}

/**
 * A PwC charge code. `number` is only needed for T&E; `name` (libellé) is the primary label.
 *
 * Either **real** (`isVirtual === false`, exists in T&E, imported) or **virtual** (Walker-only,
 * `realCodeId` points at exactly one real code — ADR-0008). `number`, `label`, and `activities` are
 * already resolved by the API: a virtual code's own for a real code, borrowed from its real code
 * otherwise — the SPA never needs to resolve them itself.
 */
export interface TimesheetCode {
  id: string
  number: string // e.g. "N9/1042"
  name: string // human project name (libellé), e.g. "Paper V4"
  label: string // technical T&E label, e.g. "MNT - PAP V4"
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
}

/** A non-worked day, reflected from T&E (read-only) or entered manually in the POC. */
export interface Absence {
  date: string // ISO date "YYYY-MM-DD"
  reason: string // "Annual leave", "Public holiday", ...
}

export type FortnightPeriod = 'first' | 'second' // 1–15 | 16–end

/** One day column in the Fortnight/Checklist grid. */
export interface DayColumn {
  day: number // day-of-month
  weekday: string // "Mon", "Tue", ...
  isWeekend: boolean // non-working day (per work rhythm)
  isAbsence: boolean
  absenceReason?: string
  isToday: boolean
}

export type FortnightRowKey = string // `${codeId}|${activity}`

/** A Code × Activity row: minutes per day-of-month. */
export interface FortnightRow {
  key: FortnightRowKey
  code: TimesheetCode
  activity: ActivityName
  minutesByDay: Record<number, number>
}

/** Which grid cells have been keyed into T&E. Key = `${rowKey}#${day}`. */
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

export const checklistKey = (rowKey: FortnightRowKey, day: number): string => `${rowKey}#${day}`

/** The Task status workflow: To-do -> In-progress -> Waiting -> Test -> Done (Waiting/Test skippable). */
export type TaskStatus = 'todo' | 'in_progress' | 'waiting' | 'test' | 'done'

export type TaskPriority = 'low' | 'medium' | 'high'

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
  createdAt: string // ISO datetime
  updatedAt: string // ISO datetime
}
