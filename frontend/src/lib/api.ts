// Typed client for the Walker JSON API (served under /api — see ADR-0003).
// The dev server proxies /api to the FastAPI backend; in production the SPA and API
// share an origin, so relative paths work in both.
import type { Entry, ReferenceCode, Task, TaskPriority, TaskStatus, TimesheetCode } from '../types'

interface ApiActivity {
  code: string
  label: string
}

interface ApiCode {
  id: number
  number: string
  label: string
  name: string
  color: string
  activities: ApiActivity[]
  is_virtual: boolean
  real_code_id: number | null
  real_code_number: string | null
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${path}`)
  }
  return (await response.json()) as T
}

function mapCode(code: ApiCode): TimesheetCode {
  return {
    id: String(code.id),
    number: code.number,
    label: code.label,
    name: code.name,
    color: code.color,
    activities: code.activities,
    isVirtual: code.is_virtual,
    realCodeId: code.real_code_id == null ? null : String(code.real_code_id),
    realCodeNumber: code.real_code_number,
  }
}

/** Fetch the current user's code catalog (real and virtual). Backend ids are numeric; the SPA uses string ids. */
export async function fetchCodes(): Promise<TimesheetCode[]> {
  const codes = await getJson<ApiCode[]>('/api/codes')
  return codes.map(mapCode)
}

interface ApiEntry {
  id: number
  date: string
  start_minute: number
  end_minute: number | null
  timesheet_code_id: number | null
  activity: string | null
  description: string | null
}

function mapEntry(entry: ApiEntry): Entry {
  return {
    id: String(entry.id),
    date: entry.date,
    start: entry.start_minute,
    end: entry.end_minute,
    codeId: entry.timesheet_code_id == null ? null : String(entry.timesheet_code_id),
    activity: entry.activity,
    description: entry.description ?? '',
  }
}

async function sendJson<T>(path: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${path}`)
  }
  return (await response.json()) as T
}

/** A partial categorization applied to a timer switch / new segment. */
export interface TimerCategory {
  codeId?: string | null
  activity?: string | null
  description?: string | null
}

function categoryBody(category: TimerCategory): Record<string, unknown> {
  return {
    timesheet_code_id: category.codeId == null ? null : Number(category.codeId),
    activity: category.activity ?? null,
    description: category.description ?? null,
  }
}

/** List the current user's entries for a day (ISO "YYYY-MM-DD"). */
export async function fetchEntries(date: string): Promise<Entry[]> {
  const entries = await getJson<ApiEntry[]>(`/api/entries?date=${encodeURIComponent(date)}`)
  return entries.map(mapEntry)
}

/** List the current user's entries between two dates (inclusive), ordered by day then start. */
export async function fetchEntriesRange(from: string, to: string): Promise<Entry[]> {
  const query = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  const entries = await getJson<ApiEntry[]>(`/api/entries?${query}`)
  return entries.map(mapEntry)
}

/** Start a running, uncategorized entry. */
export async function startTimer(): Promise<Entry> {
  return mapEntry(await sendJson<ApiEntry>('/api/timer/start', 'POST'))
}

/** Close the running entry and open a new one, atomically. */
export async function switchTimer(category: TimerCategory = {}): Promise<Entry> {
  return mapEntry(await sendJson<ApiEntry>('/api/timer/switch', 'POST', categoryBody(category)))
}

/** Close the running entry. */
export async function stopTimer(): Promise<Entry> {
  return mapEntry(await sendJson<ApiEntry>('/api/timer/stop', 'POST'))
}

/** Edit any field of an entry; only provided keys are sent. */
export async function patchEntry(id: string, patch: Partial<Entry>): Promise<Entry> {
  const body: Record<string, unknown> = {}
  if (patch.date !== undefined) body.date = patch.date
  if (patch.start !== undefined) body.start_minute = patch.start
  if (patch.end !== undefined) body.end_minute = patch.end
  if (patch.codeId !== undefined) {
    body.timesheet_code_id = patch.codeId == null ? null : Number(patch.codeId)
  }
  if (patch.activity !== undefined) body.activity = patch.activity
  if (patch.description !== undefined) body.description = patch.description
  return mapEntry(await sendJson<ApiEntry>(`/api/entries/${id}`, 'PATCH', body))
}

/** Create a completed entry directly (no timer) — for past or future time. */
export async function createEntry(fields: Partial<Entry> = {}): Promise<Entry> {
  const body: Record<string, unknown> = {}
  if (fields.date !== undefined) body.date = fields.date
  if (fields.start !== undefined) body.start_minute = fields.start
  if (fields.end !== undefined) body.end_minute = fields.end
  if (fields.codeId !== undefined) {
    body.timesheet_code_id = fields.codeId == null ? null : Number(fields.codeId)
  }
  if (fields.activity !== undefined) body.activity = fields.activity
  if (fields.description !== undefined) body.description = fields.description
  return mapEntry(await sendJson<ApiEntry>('/api/entries', 'POST', body))
}

/** Delete an entry. */
export async function deleteEntry(id: string): Promise<void> {
  const response = await fetch(`/api/entries/${id}`, { method: 'DELETE' })
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for /api/entries/${id}`)
  }
}

/** Fields sent when creating or updating a code. */
export interface CodeWrite {
  number: string
  label: string
  name?: string | null
  color?: string | null
  activities: { code: string; label: string }[]
}

function codeBody(input: CodeWrite): Record<string, unknown> {
  return {
    number: input.number,
    label: input.label,
    name: input.name ?? null,
    color: input.color ?? null,
    activities: input.activities.map((a) => ({ code: a.code, label: a.label })),
  }
}

/** Create a code (+ activities). */
export async function createCode(input: CodeWrite): Promise<TimesheetCode> {
  return mapCode(await sendJson<ApiCode>('/api/codes', 'POST', codeBody(input)))
}

/** Update a code (replaces its activities). */
export async function updateCode(id: string, input: CodeWrite): Promise<TimesheetCode> {
  return mapCode(await sendJson<ApiCode>(`/api/codes/${id}`, 'PUT', codeBody(input)))
}

/** Fields sent when creating a virtual code (ADR-0008): backed by exactly one real code. */
export interface VirtualCodeWrite {
  realCodeId: string
  name: string
  color?: string | null
}

/** Create a virtual code linked to a real code; borrows the real code's number/label/activities. */
export async function createVirtualCode(input: VirtualCodeWrite): Promise<TimesheetCode> {
  return mapCode(
    await sendJson<ApiCode>('/api/codes/virtual', 'POST', {
      real_code_id: Number(input.realCodeId),
      name: input.name,
      color: input.color ?? null,
    }),
  )
}

/** Update a virtual code's name, colour, and/or backing real code (ADR-0008). */
export async function updateVirtualCode(
  id: string,
  input: VirtualCodeWrite,
): Promise<TimesheetCode> {
  return mapCode(
    await sendJson<ApiCode>(`/api/codes/virtual/${id}`, 'PUT', {
      real_code_id: Number(input.realCodeId),
      name: input.name,
      color: input.color ?? null,
    }),
  )
}

/** Delete a code; the server rejects deletion of a code still referenced by an entry. */
export async function deleteCode(id: string): Promise<void> {
  const response = await fetch(`/api/codes/${id}`, { method: 'DELETE' })
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for /api/codes/${id}`)
  }
}

interface ApiReferenceCode {
  id: number
  number: string
  label: string
  name: string
  activities: { code: string; label: string }[]
}

/** Search the reference catalog (autocomplete) by number/label/name. */
export async function searchReference(q: string, limit = 20): Promise<ReferenceCode[]> {
  const query = `q=${encodeURIComponent(q)}&limit=${limit}`
  const refs = await getJson<ApiReferenceCode[]>(`/api/reference?${query}`)
  return refs.map((r) => ({ ...r, id: String(r.id) }))
}

/** Copy a reference code (by number) into the user's active codes. */
export async function addCodeFromReference(number: string): Promise<TimesheetCode> {
  return mapCode(await sendJson<ApiCode>('/api/codes/from-reference', 'POST', { number }))
}

/** Import a catalog CSV into the reference catalog; upserts by number. Returns created/updated. */
export async function importCatalog(file: File): Promise<{ created: number; updated: number }> {
  const form = new FormData()
  form.append('file', file)
  const response = await fetch('/api/catalog/import', { method: 'POST', body: form })
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`
    try {
      const body = (await response.json()) as { detail?: string }
      if (body?.detail) detail = body.detail
    } catch {
      // no JSON body — keep the status-line message
    }
    throw new Error(detail)
  }
  return (await response.json()) as { created: number; updated: number }
}

interface ApiFortnightRow {
  timesheet_code_id: number
  activity: string
  minutes_by_day: Record<string, number>
}

interface ApiFortnight {
  start: string
  end: string
  rows: ApiFortnightRow[]
}

/** Fetch the aggregated fortnight grid as a `${codeId}|${activity}` → day → minutes matrix. */
export async function fetchFortnight(
  date: string,
): Promise<Record<string, Record<number, number>>> {
  const grid = await getJson<ApiFortnight>(`/api/fortnight/${date}`)
  const matrix: Record<string, Record<number, number>> = {}
  for (const row of grid.rows) {
    const byDay: Record<number, number> = {}
    for (const [day, minutes] of Object.entries(row.minutes_by_day)) {
      byDay[Number(day)] = minutes
    }
    matrix[`${row.timesheet_code_id}|${row.activity}`] = byDay
  }
  return matrix
}

interface ApiChecklistItem {
  timesheet_code_id: number
  activity: string
  day: number
  entered: boolean
}

/** A single checklist cell to toggle. */
export interface ChecklistMarkInput {
  timesheet_code_id: number
  activity: string
  day: number
  entered: boolean
}

/** Fetch the checklist as a `${codeId}|${activity}#${day}` → true map of entered cells. */
export async function fetchChecklist(date: string): Promise<Record<string, boolean>> {
  const data = await getJson<{ items: ApiChecklistItem[] }>(`/api/fortnight/${date}/checklist`)
  const checked: Record<string, boolean> = {}
  for (const item of data.items) {
    if (item.entered) {
      checked[`${item.timesheet_code_id}|${item.activity}#${item.day}`] = true
    }
  }
  return checked
}

/** Toggle a single checklist cell's entered state. */
export async function toggleChecklist(date: string, mark: ChecklistMarkInput): Promise<void> {
  await sendJson<unknown>(`/api/fortnight/${date}/checklist`, 'PATCH', mark)
}

/** Clear every tick for the fortnight. */
export async function resetChecklist(date: string): Promise<void> {
  const response = await fetch(`/api/fortnight/${date}/checklist`, { method: 'DELETE' })
  if (!response.ok) {
    throw new Error(
      `${response.status} ${response.statusText} for /api/fortnight/${date}/checklist`,
    )
  }
}

interface ApiSettings {
  workdays: boolean[]
  density: string
  absences: { date: string; reason: string }[]
}

/** The user's settings as used by the SPA. */
export interface SettingsData {
  workdays: boolean[]
  density: 'comfortable' | 'compact'
  absences: { date: string; reason: string }[]
}

function mapSettings(settings: ApiSettings): SettingsData {
  return {
    workdays: settings.workdays,
    density: settings.density === 'compact' ? 'compact' : 'comfortable',
    absences: settings.absences,
  }
}

/** Fetch the user's settings (work rhythm, density, absences). */
export async function fetchSettings(): Promise<SettingsData> {
  return mapSettings(await getJson<ApiSettings>('/api/settings'))
}

/** Update the work rhythm + density. */
export async function updateSettings(workdays: boolean[], density: string): Promise<SettingsData> {
  return mapSettings(await sendJson<ApiSettings>('/api/settings', 'PUT', { workdays, density }))
}

/** Add (or update the reason of) an absence. */
export async function addAbsence(date: string, reason: string): Promise<SettingsData> {
  return mapSettings(
    await sendJson<ApiSettings>('/api/settings/absences', 'POST', { date, reason }),
  )
}

/** Remove an absence for a date. */
export async function removeAbsence(date: string): Promise<SettingsData> {
  const response = await fetch(`/api/settings/absences/${date}`, { method: 'DELETE' })
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for /api/settings/absences/${date}`)
  }
  return mapSettings((await response.json()) as ApiSettings)
}

interface ApiTask {
  id: number
  title: string
  description: string | null
  status: string
  priority: string | null
  due_date: string | null
  tags: string[]
  timesheet_code_id: number | null
  created_at: string
  updated_at: string
}

function mapTask(task: ApiTask): Task {
  return {
    id: String(task.id),
    title: task.title,
    description: task.description ?? '',
    status: task.status as TaskStatus,
    priority: (task.priority as TaskPriority | null) ?? null,
    dueDate: task.due_date,
    tags: task.tags,
    codeId: task.timesheet_code_id == null ? null : String(task.timesheet_code_id),
    createdAt: task.created_at,
    updatedAt: task.updated_at,
  }
}

/** Fields sent when creating or updating a Task. */
export interface TaskWrite {
  title: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority | null
  dueDate?: string | null
  tags?: string[]
  codeId?: string | null
}

function taskBody(input: TaskWrite): Record<string, unknown> {
  return {
    title: input.title,
    description: input.description ?? null,
    status: input.status ?? 'todo',
    priority: input.priority ?? null,
    due_date: input.dueDate ?? null,
    tags: input.tags ?? [],
    timesheet_code_id: input.codeId == null ? null : Number(input.codeId),
  }
}

/** Fetch the current user's Tasks. */
export async function fetchTasks(): Promise<Task[]> {
  const tasks = await getJson<ApiTask[]>('/api/tasks')
  return tasks.map(mapTask)
}

/** Create a Task. Orphan Tasks (no code) are allowed. */
export async function createTask(input: TaskWrite): Promise<Task> {
  return mapTask(await sendJson<ApiTask>('/api/tasks', 'POST', taskBody(input)))
}

/** Update every field of a Task. */
export async function updateTask(id: string, input: TaskWrite): Promise<Task> {
  return mapTask(await sendJson<ApiTask>(`/api/tasks/${id}`, 'PUT', taskBody(input)))
}

/** Delete a Task. */
export async function deleteTask(id: string): Promise<void> {
  const response = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for /api/tasks/${id}`)
  }
}

/** Fetch every distinct tag used across the user's Tasks (for autocomplete). */
export async function fetchTaskTags(): Promise<string[]> {
  return getJson<string[]>('/api/tasks/tags')
}
