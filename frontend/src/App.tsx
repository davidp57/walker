import { useEffect, useMemo, useState } from 'react'
import './styles/tokens.css'
import './styles/walker.css'
import { AppShell, type Route, type ShellUser } from './components/AppShell'
import { TimerBar } from './components/TimerBar'
import { CodePicker } from './components/CodePicker'
import { CodeEditor } from './components/CodeEditor'
import { VirtualCodeEditor } from './components/VirtualCodeEditor'
import { EntryEditor } from './components/EntryEditor'
import { CellEntriesModal } from './components/CellEntriesModal'
import { TrackerScreen, type DayGroup } from './screens/TrackerScreen'
import { PeriodScreen } from './screens/PeriodScreen'
import { CodeCatalogScreen } from './screens/CodeCatalogScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { TasksScreen } from './screens/TasksScreen'
import { TaskPanel, type TaskDraft } from './components/TaskPanel'
import { LoginScreen } from './components/LoginScreen'
import type {
  Absence,
  ActivityName,
  ChecklistState,
  DayColumn,
  Density,
  Entry,
  PeriodRow,
  PeriodScheme,
  Task,
  TaskSuggestion,
  Theme,
  TimesheetCode,
} from './types'
import { resolveChecklistRows } from './lib/checklist'
import { elapsedSecondsSince, formatDuration } from './lib/time'
import {
  applyResolvedTheme,
  readCachedThemePreference,
  resolveTheme,
  writeCachedThemePreference,
} from './lib/theme'
import { shouldRetagInPlace } from './lib/timer'
import { lastDescriptionFor } from './lib/tasks'
import { ToastProvider } from './lib/toast'
import { errorMessage, useToast } from './lib/toastContext'
import {
  addAbsence as apiAddAbsence,
  addCodeFromReference as apiAddCodeFromReference,
  ApiError,
  completeTimer as apiCompleteTimer,
  createCode as apiCreateCode,
  createEntry as apiCreateEntry,
  createTask as apiCreateTask,
  createVirtualCode as apiCreateVirtualCode,
  deleteCode as apiDeleteCode,
  deleteEntry as apiDeleteEntry,
  deleteTask as apiDeleteTask,
  fetchChecklist,
  fetchCodes,
  fetchEntriesRange,
  fetchHealth,
  fetchPeriod,
  fetchSettings,
  fetchTaskTags,
  fetchTasks,
  fetchUser,
  importCatalog as apiImportCatalog,
  patchEntry as apiPatchEntry,
  removeAbsence as apiRemoveAbsence,
  resetChecklist as apiResetChecklist,
  searchReference,
  startTimer as apiStartTimer,
  stopTimer as apiStopTimer,
  switchTimer as apiSwitchTimer,
  toggleChecklist as apiToggleChecklist,
  updateCode as apiUpdateCode,
  updateSettings as apiUpdateSettings,
  updateTask as apiUpdateTask,
  updateVirtualCode as apiUpdateVirtualCode,
  type SsoProvider,
} from './lib/api'

// ---- Today (real local date, matches the server-recorded entries) ----
const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const TODAY = isoDate(new Date())

// Shift an ISO date by whole days; label a day for the tracker's section headers.
const addDays = (iso: string, delta: number): string => {
  const [y, m, d] = iso.split('-').map(Number)
  return isoDate(new Date(y, m - 1, d + delta))
}
const dayLabel = (iso: string): string => {
  if (iso === TODAY) return 'Today'
  if (iso === addDays(TODAY, -1)) return 'Yesterday'
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Timesheet period bounds (ADR-0009), mirroring `services/period.py::period_bounds` — a pure
// function of (scheme, date) with no side effects, so the SPA reshapes the period view instantly
// on a scheme change with no server round-trip needed to recompute boundaries.
const periodBounds = (scheme: PeriodScheme, anchor: string): { start: Date; end: Date } => {
  const [y, m, d] = anchor.split('-').map(Number)
  const idx = m - 1
  if (scheme === 'weekly') {
    const dt = new Date(y, idx, d)
    const mondayOffset = (dt.getDay() + 6) % 7 // Sunday=0 -> 6 days back to Monday
    const start = new Date(y, idx, d - mondayOffset)
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)
    return { start, end }
  }
  if (scheme === 'monthly') {
    return { start: new Date(y, idx, 1), end: new Date(y, idx + 1, 0) }
  }
  // semi_monthly (default): 1st-15th or 16th-end of month.
  if (d <= 15) return { start: new Date(y, idx, 1), end: new Date(y, idx, 15) }
  return { start: new Date(y, idx, 16), end: new Date(y, idx + 1, 0) }
}

// The Timesheet period's start date (ISO), for the API reference date.
const periodStartFor = (scheme: PeriodScheme, anchor: string): string =>
  isoDate(periodBounds(scheme, anchor).start)

// Move to the previous/next Timesheet period, crossing month boundaries.
const shiftPeriod = (scheme: PeriodScheme, anchor: string, dir: -1 | 1): string => {
  const { start, end } = periodBounds(scheme, anchor)
  const step =
    dir === 1
      ? new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1)
      : new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1)
  return isoDate(step)
}

// Human label for the Timesheet period containing `anchor`, e.g. "1 – 15 July 2026".
const periodLabelFor = (scheme: PeriodScheme, anchor: string): string => {
  const { start, end } = periodBounds(scheme, anchor)
  const monthLabel = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()} – ${end.getDate()} ${monthLabel(start)}`
  }
  return `${start.getDate()} ${monthLabel(start)} – ${end.getDate()} ${monthLabel(end)}`
}

// Parse a checklist key `${codeId}|${activity}#${day}` back into a server mark.
const parseChecklistKey = (
  key: string,
): { timesheet_code_id: number; activity: string; day: number } | null => {
  const hash = key.lastIndexOf('#')
  const bar = key.indexOf('|')
  if (hash < 0 || bar < 0 || bar > hash) return null
  return {
    timesheet_code_id: Number(key.slice(0, bar)),
    activity: key.slice(bar + 1, hash),
    day: Number(key.slice(hash + 1)),
  }
}

interface TimerDraft {
  codeId: string | null
  activity: ActivityName | null
  description: string
}
const EMPTY_DRAFT: TimerDraft = { codeId: null, activity: null, description: '' }

// How long an undo affordance stays available after a delete (BIZ-011).
const UNDO_WINDOW_MS = 6000

type AuthGateState =
  | { status: 'checking' }
  | { status: 'authenticated' }
  | { status: 'needs-login'; providers: SsoProvider[] }

/**
 * Gates the app behind a sign-in screen when this deployment requires SSO (ADR-0010) and the
 * visitor has no valid session yet — `/api/health` is always reachable (unlike `/auth/*`, only
 * mounted in `sso` mode), so it's safe to check first regardless of deployment mode. Any failure
 * other than a confirmed 401 (network hiccup, `auth_mode=none`) falls through to rendering the app
 * as before BIZ-029, so a flaky check can never newly lock out a standalone deployment.
 */
function useAuthGate(): AuthGateState {
  const [state, setState] = useState<AuthGateState>({ status: 'checking' })

  useEffect(() => {
    let cancelled = false
    fetchHealth()
      .then((health) => {
        if (health.authMode === 'none') {
          if (!cancelled) setState({ status: 'authenticated' })
          return
        }
        fetchUser()
          .then(() => {
            if (!cancelled) setState({ status: 'authenticated' })
          })
          .catch((err: unknown) => {
            if (cancelled) return
            if (err instanceof ApiError && err.status === 401) {
              setState({ status: 'needs-login', providers: health.ssoProviders })
            } else {
              setState({ status: 'authenticated' })
            }
          })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'authenticated' })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}

export default function App() {
  const authGate = useAuthGate()

  if (authGate.status === 'checking') return null
  if (authGate.status === 'needs-login') return <LoginScreen providers={authGate.providers} />

  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  )
}

function AppInner() {
  const { notifyError } = useToast()
  const [route, setRoute] = useState<Route>('tracker')
  const [user, setUser] = useState<ShellUser | undefined>(undefined)
  const [codes, setCodes] = useState<TimesheetCode[]>([])
  const [codesLoading, setCodesLoading] = useState(true)
  const [entries, setEntries] = useState<Entry[]>([])
  const [entriesLoading, setEntriesLoading] = useState(true)
  const [draft, setDraft] = useState<TimerDraft>(EMPTY_DRAFT)
  const [now, setNow] = useState(Date.now())
  const [anchor, setAnchor] = useState<string>(TODAY)
  const [matrix, setMatrix] = useState<Record<string, Record<number, number>>>({})
  const [checked, setChecked] = useState<ChecklistState>({})
  const [picker, setPicker] = useState<{ target: 'timer' | string } | null>(null)
  const [editor, setEditor] = useState<{ code: TimesheetCode | null; initialName?: string } | null>(
    null,
  )
  // `reopenPicker` is set when the virtual-code editor was opened from CodePicker's "create on the
  // fly" action (BIZ-013): on save, the picker reopens on the same target so the newly created
  // virtual code can be picked in one more click ("used immediately" — see saveVirtualCode below).
  const [virtualEditor, setVirtualEditor] = useState<{
    code: TimesheetCode | null
    reopenPicker?: string | null
  } | null>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [trackerFrom, setTrackerFrom] = useState<string>(() => addDays(TODAY, -13))
  const [editorEntry, setEditorEntry] = useState<Entry | null>(null)
  // A not-yet-persisted entry being composed in the Timesheet period view; persisted only on Save.
  const [addDraft, setAddDraft] = useState<Entry | null>(null)
  const [cellDrill, setCellDrill] = useState<{
    date: string
    codeId: string
    activity: string
    title: string
  } | null>(null)
  const [cellEntries, setCellEntries] = useState<Entry[]>([])
  // The most recently deleted Entry, kept around so "Undo" can restore it (BIZ-011); cleared once
  // the undo window elapses or another delete/undo replaces it.
  const [pendingDelete, setPendingDelete] = useState<Entry | null>(null)

  // Tasks (BIZ-021): server-backed list + side panel.
  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [taskTags, setTaskTags] = useState<string[]>([])
  // `{ task: null }` = creating a new Task; `{ task }` = editing an existing one.
  const [taskPanel, setTaskPanel] = useState<{ task: Task | null } | null>(null)
  // The Task a start-from-Task action (BIZ-023) is starting a Timer for, while its Code picker
  // (target 'task') is open — title becomes the comment, code is prefilled, Activity is chosen.
  const [pendingTaskStart, setPendingTaskStart] = useState<Task | null>(null)

  // Settings (drive the Timesheet period grid + density)
  const [workdays, setWorkdays] = useState<boolean[]>([false, true, true, true, true, true, false]) // Sun..Sat
  const [absences, setAbsences] = useState<Absence[]>([])
  const [density, setDensity] = useState<Density>('comfortable')
  const [periodScheme, setPeriodScheme] = useState<PeriodScheme>('semi_monthly')
  // Seeded from the last preference the server returned, not a hardcoded "system" (BIZ-032): the
  // theme-applying effect below runs on this very first render, before `fetchSettings` resolves —
  // starting from the real last-known preference avoids momentarily resolving the wrong theme and
  // clobbering the flash-free value `main.tsx` already painted from its own resolved-theme cache.
  const [theme, setTheme] = useState<Theme>(() => readCachedThemePreference() ?? 'system')

  useEffect(() => {
    document.documentElement.dataset.density = density === 'compact' ? 'compact' : ''
  }, [density])

  // Apply the resolved theme (BIZ-032): mirrors `resolve_theme`'s logic (services/settings.py) —
  // "system" defers to the OS's prefers-color-scheme, "dark"/"light" always win outright. Listens
  // for a live OS-preference change so a "system" preference updates the rendered theme with no
  // reload; the listener is a no-op (but harmless) once the preference is explicitly dark/light.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => applyResolvedTheme(resolveTheme(theme, media.matches))
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  // Load the catalog + settings from the API on boot.
  useEffect(() => {
    fetchUser()
      .then(setUser)
      .catch(() => setUser(undefined))
    fetchCodes()
      .then(setCodes)
      .catch((err: unknown) => notifyError(errorMessage(err, 'Could not load your code catalog.')))
      .finally(() => setCodesLoading(false))
    fetchSettings()
      .then((s) => {
        setWorkdays(s.workdays)
        setDensity(s.density)
        setPeriodScheme(s.periodScheme)
        setTheme(s.theme)
        writeCachedThemePreference(s.theme)
        setAbsences(s.absences)
      })
      .catch((err: unknown) => notifyError(errorMessage(err, 'Could not load your settings.')))
    fetchTasks()
      .then(setTasks)
      .catch((err: unknown) => notifyError(errorMessage(err, 'Could not load your tasks.')))
      .finally(() => setTasksLoading(false))
    fetchTaskTags()
      .then(setTaskTags)
      .catch(() => setTaskTags([]))
  }, [notifyError])

  // Load entries for the tracker window (BIZ-003); widening `trackerFrom` loads earlier days.
  useEffect(() => {
    fetchEntriesRange(trackerFrom, TODAY)
      .then((es) => {
        setEntries(es)
        const active = es.find((e) => e.end === null)
        if (active) {
          setDraft({
            codeId: active.codeId,
            activity: active.activity,
            description: active.description,
          })
        }
      })
      .catch((err: unknown) => notifyError(errorMessage(err, 'Could not load your entries.')))
      .finally(() => setEntriesLoading(false))
  }, [trackerFrom, notifyError])

  // Load the Timesheet period grid + checklist whenever the anchored period, scheme, or entries
  // change — a scheme change reshapes the view immediately (BIZ-027): no stale cached period.
  useEffect(() => {
    const ref = periodStartFor(periodScheme, anchor)
    fetchPeriod(ref)
      .then(setMatrix)
      .catch((err: unknown) =>
        notifyError(errorMessage(err, 'Could not load the Timesheet period grid.')),
      )
    fetchChecklist(ref)
      .then(setChecked)
      .catch((err: unknown) => notifyError(errorMessage(err, 'Could not load the checklist.')))
  }, [anchor, periodScheme, entries, notifyError])

  const reload = () =>
    fetchEntriesRange(trackerFrom, TODAY)
      .then(setEntries)
      .catch((err: unknown) => notifyError(errorMessage(err, 'Could not refresh your entries.')))

  const running = entries.find((e) => e.end === null) ?? null
  const runningId = running?.id ?? null

  // Entries still lacking a Timesheet code (BIZ-010) — surfaced as a live count in the shell so
  // nothing is left uncoded before the Timesheet period closes. Mirrors EntryRow's own `flagged` rule.
  const uncategorizedCount = useMemo(() => entries.filter((e) => !e.codeId).length, [entries])

  // Tick the clock every second only while a timer is running.
  useEffect(() => {
    if (runningId == null) return
    const iv = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(iv)
  }, [runningId])

  const codesById = useMemo(() => Object.fromEntries(codes.map((c) => [c.id, c])), [codes])

  const timerCode = draft.codeId ? (codesById[draft.codeId] ?? null) : null
  const elapsedSeconds = running ? elapsedSecondsSince(running.date, running.start, now) : 0
  const runningMinutes = Math.floor(elapsedSeconds / 60)

  // ---- Timer operations (server-backed) ----
  const startTimer = () => {
    apiStartTimer()
      .then(reload)
      .catch((err: unknown) => notifyError(errorMessage(err, 'Could not start the timer.')))
  }
  // Enter-to-start (BIZ-009): start a Timer, then immediately attribute the typed description to
  // it — the one-click empty Start (capture-first — ADR-0006) is untouched, this is a distinct
  // gesture only reachable via Enter in the description field or the start/stop shortcut.
  const startTimerWithDescription = (description: string) => {
    apiStartTimer()
      .then((created) =>
        description.trim() === ''
          ? created
          : apiPatchEntry(created.id, { description }).catch(() => created),
      )
      .then(reload)
      .catch(() => reload())
  }
  const stopTimer = () => {
    if (!running) return
    apiPatchEntry(running.id, {
      codeId: draft.codeId,
      activity: draft.activity,
      description: draft.description,
    })
      .then(() => apiStopTimer())
      .then(() => {
        setDraft(EMPTY_DRAFT)
        return reload()
      })
      .catch((err: unknown) => notifyError(errorMessage(err, 'Could not stop the timer.')))
  }
  // Complete (BIZ-023): stop the Timer and mark its linked Task Done, in one call — the running
  // entry's categorization is saved first, exactly as Stop does, so nothing typed is lost.
  const completeTimer = () => {
    if (!running) return
    apiPatchEntry(running.id, {
      codeId: draft.codeId,
      activity: draft.activity,
      description: draft.description,
    })
      .then(() => apiCompleteTimer())
      .then(() => {
        setDraft(EMPTY_DRAFT)
        return Promise.all([reload(), reloadTasks()])
      })
      .catch((err: unknown) => notifyError(errorMessage(err, 'Could not complete the task.')))
  }
  // Start a Timer from a Task (BIZ-023): title becomes the comment, code is prefilled — the Code
  // picker still opens so the Activity is chosen (scoped to the Task's code when it has one).
  const startTaskTimer = (task: Task) => {
    setDraft({ codeId: task.codeId, activity: null, description: task.title })
    setPendingTaskStart(task)
    setPicker({ target: 'task' })
  }
  const cancelTimer = () => {
    if (running) {
      apiDeleteEntry(running.id)
        .then(() => {
          setDraft(EMPTY_DRAFT)
          return reload()
        })
        .catch((err: unknown) => notifyError(errorMessage(err, 'Could not cancel the timer.')))
    } else {
      setDraft(EMPTY_DRAFT)
    }
  }

  // Global shortcuts (BIZ-009): Ctrl/Cmd+Enter toggles start/stop; Ctrl/Cmd+K opens the task
  // switcher — so the daily loop never needs the mouse. Ignored while typing in an unrelated
  // input/textarea/select (the description field's plain Enter is handled by TimerBar itself).
  useEffect(() => {
    const isTypingElsewhere = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false
      if (target.isContentEditable) return true
      const tag = target.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      if (isTypingElsewhere(e.target)) return
      if (e.key === 'Enter') {
        e.preventDefault()
        if (running) stopTimer()
        else startTimer()
      } else if (e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPicker({ target: 'timer' })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  // Pick a task for the running timer. Re-tag an empty capture-first stub in place (attributing the
  // elapsed time to the picked task); only split (switch) for a genuine change on real work.
  // Splitting a stub would orphan the pre-categorization minutes as a phantom uncategorized entry.
  const pickTask = (codeId: string, activity: ActivityName) => {
    if (!running) {
      setDraft((d) => ({ ...d, codeId, activity }))
      return
    }
    setDraft((d) => ({ ...d, codeId, activity }))
    if (shouldRetagInPlace(running)) {
      apiPatchEntry(running.id, { codeId, activity })
        .then(reload)
        .catch((err: unknown) => notifyError(errorMessage(err, 'Could not save the entry.')))
    } else {
      apiSwitchTimer({ codeId, activity, description: draft.description })
        .then(reload)
        .catch((err: unknown) => notifyError(errorMessage(err, 'Could not switch task.')))
    }
  }

  const resumeEntry = (id: string) => {
    const e = entries.find((x) => x.id === id)
    if (!e) return
    const category = { codeId: e.codeId, activity: e.activity, description: e.description }
    setDraft(category)
    // Re-tag an empty stub in place; otherwise start a fresh segment (closing real running work).
    const apply =
      running && shouldRetagInPlace(running)
        ? apiPatchEntry(running.id, category)
        : apiSwitchTimer(category)
    apply
      .then(reload)
      .catch((err: unknown) => notifyError(errorMessage(err, 'Could not resume this task.')))
  }

  // Compose a manual entry (no timer): default to today 9:00–10:00. Nothing is written until Save
  // (BIZ-011) — cancelling the editor leaves no phantom entry, matching the Timesheet period add path.
  const addEntry = () => {
    setAddDraft({
      id: 'new',
      date: TODAY,
      start: 9 * 60,
      end: 10 * 60,
      codeId: null,
      activity: null,
      description: '',
    })
  }

  // Compose an entry inside the Timesheet period view. Nothing is written until Save (no phantom on
  // cancel). Default the date to today when viewing the current period, else the first day of the
  // viewed one.
  const openAddEntryInPeriod = () => {
    const periodStart = periodStartFor(periodScheme, anchor)
    const date = periodStart === periodStartFor(periodScheme, TODAY) ? TODAY : periodStart
    setAddDraft({
      id: 'new',
      date,
      start: 9 * 60,
      end: 10 * 60,
      codeId: null,
      activity: null,
      description: '',
    })
  }
  const saveAddDraft = (patch: Partial<Entry>) => {
    if (!addDraft) return
    const e = { ...addDraft, ...patch }
    apiCreateEntry({
      date: e.date,
      start: e.start,
      end: e.end,
      codeId: e.codeId,
      activity: e.activity,
      description: e.description,
    })
      .then(reload)
      .catch((err: unknown) => notifyError(errorMessage(err, 'Could not save the entry.')))
  }

  // Delete an Entry, but keep it around for a short undo window instead of losing it outright
  // (BIZ-011): a mis-click on the delete action must never silently lose tracked time. `onSettled`
  // runs once the delete (or its fallback reload) has resolved — e.g. to refresh a cell drill-down.
  const deleteEntryWithUndo = (entry: Entry, onSettled?: () => void) => {
    apiDeleteEntry(entry.id)
      .then(() => {
        setPendingDelete(entry)
        return reload()
      })
      .catch((err: unknown) => {
        notifyError(errorMessage(err, 'Could not delete the entry.'))
        return reload()
      })
      .then(onSettled)
  }
  // Restore the most recently deleted Entry with its fields intact. Recreates it through the
  // existing create endpoint (no dedicated undo/restore endpoint) — the entry gets a new id, but
  // every field the user tracked (date, times, code, activity, description) is preserved.
  const undoDelete = () => {
    if (!pendingDelete) return
    const { date, start, end, codeId, activity, description } = pendingDelete
    setPendingDelete(null)
    apiCreateEntry({ date, start, end, codeId, activity, description })
      .then(reload)
      .catch(() => reload())
  }

  // Auto-dismiss the undo affordance once its window elapses.
  useEffect(() => {
    if (!pendingDelete) return
    const timeout = window.setTimeout(() => setPendingDelete(null), UNDO_WINDOW_MS)
    return () => window.clearTimeout(timeout)
  }, [pendingDelete])

  // ---- Code catalog (server-backed — BIZ-001 / BIZ-002) ----
  const reloadCodes = () =>
    fetchCodes()
      .then(setCodes)
      .catch((err: unknown) =>
        notifyError(errorMessage(err, 'Could not refresh your code catalog.')),
      )
  const isCodeInUse = (id: string): boolean =>
    entries.some((e) => e.codeId === id) ||
    Object.keys(matrix).some((k) => k.startsWith(`${id}|`)) ||
    codes.some((c) => c.realCodeId === id)
  const saveCode = (code: TimesheetCode) => {
    const payload = {
      number: code.number,
      label: code.label,
      name: code.name,
      color: code.color,
      activities: code.activities,
    }
    const op = codes.some((c) => c.id === code.id)
      ? apiUpdateCode(code.id, payload)
      : apiCreateCode(payload)
    op.then(reloadCodes).catch((err: unknown) =>
      notifyError(errorMessage(err, 'Could not save the code.')),
    )
  }
  const deleteCode = (code: TimesheetCode) => {
    apiDeleteCode(code.id)
      .then(reloadCodes)
      .catch((err: unknown) => notifyError(errorMessage(err, 'Could not delete the code.')))
  }
  // Create a virtual code (BIZ-013 "used immediately", design decision: reopen the picker rather
  // than auto-picking an activity — the newly created code is right there, one click away, with no
  // need to guess which activity the user wants).
  const saveVirtualCode = (input: {
    realCodeId: string
    name: string
    color: string
  }): Promise<void> => {
    const reopenTarget = virtualEditor?.reopenPicker ?? null
    const op = virtualEditor?.code
      ? apiUpdateVirtualCode(virtualEditor.code.id, input)
      : apiCreateVirtualCode(input)
    return op.then(reloadCodes).then(() => {
      if (reopenTarget !== null) setPicker({ target: reopenTarget })
    })
  }
  const importCatalogFile = () => {
    const picker = document.createElement('input')
    picker.type = 'file'
    picker.accept = '.csv,text/csv'
    picker.onchange = () => {
      const file = picker.files?.[0]
      if (!file) return
      setImportMessage(`Importing "${file.name}"…`)
      apiImportCatalog(file)
        .then((summary) => {
          setImportMessage(
            `Reference catalog: ${summary.created} codes added, ${summary.updated} updated. Search below to add codes.`,
          )
          return reloadCodes()
        })
        .catch((err: unknown) => {
          setImportMessage(`Import failed — ${err instanceof Error ? err.message : String(err)}`)
        })
    }
    picker.click()
  }

  // ---- Tasks (server-backed — BIZ-021) ----
  const reloadTasks = () =>
    fetchTasks()
      .then(setTasks)
      .catch((err: unknown) => notifyError(errorMessage(err, 'Could not refresh your tasks.')))
  const reloadTaskTags = () =>
    fetchTaskTags()
      .then(setTaskTags)
      .catch(() => undefined)
  const saveTask = (draft: TaskDraft) => {
    const current = taskPanel?.task ?? null
    const op = current ? apiUpdateTask(current.id, draft) : apiCreateTask(draft)
    op.then(() => {
      reloadTasks()
      reloadTaskTags()
    }).catch((err: unknown) => notifyError(errorMessage(err, 'Could not save the task.')))
  }
  const deleteTask = (task: Task) => {
    apiDeleteTask(task.id)
      .then(reloadTasks)
      .catch((err: unknown) => notifyError(errorMessage(err, 'Could not delete the task.')))
  }
  // Moving a Task across kanban columns (BIZ-022) updates only its status; other fields are unchanged.
  const moveTask = (task: Task, status: Task['status']) => {
    apiUpdateTask(task.id, {
      title: task.title,
      description: task.description,
      status,
      priority: task.priority,
      dueDate: task.dueDate,
      tags: task.tags,
      codeId: task.codeId,
    })
      .then(reloadTasks)
      .catch((err: unknown) => notifyError(errorMessage(err, 'Could not move the task.')))
  }

  // Comment suggestions (scoped to the draft's code when set)
  const suggestions: TaskSuggestion[] = useMemo(() => {
    const q = draft.description.trim().toLowerCase()
    const seen = new Set<string>()
    const pool = [...entries]
      .filter((e) => e.end !== null && e.description)
      .reverse()
      .filter((e) => {
        const k = `${e.codeId}|${e.activity}|${e.description}`
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })
    return pool
      .filter((e) => (draft.codeId ? e.codeId === draft.codeId : true))
      .filter(
        (e) =>
          !q ||
          e.description.toLowerCase().includes(q) ||
          (e.codeId ? (codesById[e.codeId]?.name.toLowerCase().includes(q) ?? false) : false),
      )
      .slice(0, 6)
      .map((e) => ({
        codeId: e.codeId,
        codeNumber: e.codeId ? (codesById[e.codeId]?.number ?? '') : '',
        codeName: e.codeId ? (codesById[e.codeId]?.name ?? '') : '',
        activity: e.activity,
        description: e.description,
        color: e.codeId ? (codesById[e.codeId]?.color ?? 'var(--wk-amber)') : 'var(--wk-amber)',
      }))
  }, [entries, draft.description, draft.codeId, codesById])

  // Timesheet period columns + rows (matrix comes from GET /api/period/{date}). Days are keyed by
  // day-of-month (matching the backend's `minutes_by_day`), which is unambiguous for the
  // `semi_monthly`/`monthly` schemes (never cross a month boundary) and also for `weekly` (a 7-day
  // window can never repeat a day-of-month value, even when it crosses into the next month).
  // `dayIsoByDayOfMonth` carries each day's full ISO date alongside its day-of-month key, so cell
  // drill-downs resolve the right date even when the period spans two months.
  const { days, dayIsoByDayOfMonth } = useMemo(() => {
    const { start, end } = periodBounds(periodScheme, anchor)
    const dayCount = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
    const isoByDay = new Map<number, string>()
    const columns: DayColumn[] = Array.from({ length: dayCount }, (_, i) => {
      const dt = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
      const iso = isoDate(dt)
      isoByDay.set(dt.getDate(), iso)
      const absence = absences.find((a) => a.date === iso)
      return {
        day: dt.getDate(),
        weekday: WD[dt.getDay()],
        isWeekend: !workdays[dt.getDay()],
        isAbsence: !!absence,
        absenceReason: absence?.reason,
        isToday: iso === TODAY,
      }
    })
    return { days: columns, dayIsoByDayOfMonth: isoByDay }
  }, [periodScheme, anchor, workdays, absences])

  const rows: PeriodRow[] = useMemo(
    () =>
      Object.keys(matrix)
        .map((key) => {
          const [codeId, activity] = key.split('|') as [string, ActivityName]
          return { key, code: codesById[codeId], activity, minutesByDay: matrix[key] }
        })
        .filter((r): r is PeriodRow => Boolean(r.code)),
    [matrix, codesById],
  )

  // The running timer as a Timesheet period cell: shown live in its code × activity row, but only
  // when it is categorized and its day falls in the period on screen. Read-only (can't edit a live
  // timer).
  const runningCell = useMemo(() => {
    if (!running?.codeId || !running.activity) return null
    const code = codesById[running.codeId]
    if (!code) return null
    const day = Number(running.date.slice(8, 10))
    const inPeriod = dayIsoByDayOfMonth.get(day) === running.date
    if (!inPeriod) return null
    return { key: `${running.codeId}|${running.activity}`, day, code, activity: running.activity }
  }, [running, dayIsoByDayOfMonth, codesById])

  // The running cell's key, resolved virtual→real (ADR-0008) so it matches `checklistRows`' keys —
  // Enter-in-Timesheet-system must tint/exclude the running cell even when tracked on a virtual code.
  const enterRunningCell = useMemo(() => {
    if (!runningCell) return null
    const realCode = runningCell.code.realCodeId
      ? (codesById[runningCell.code.realCodeId] ?? runningCell.code)
      : runningCell.code
    return { key: `${realCode.id}|${runningCell.activity}`, day: runningCell.day }
  }, [runningCell, codesById])

  // Timesheet period rows with the running timer's live minutes folded into its cell.
  // Injected even at 0 minutes so a just-started timer shows up immediately as a running cell.
  const gridRows: PeriodRow[] = useMemo(() => {
    if (!runningCell) return rows
    const { key, day, code, activity } = runningCell
    if (rows.some((r) => r.key === key)) {
      return rows.map((r) =>
        r.key === key
          ? {
              ...r,
              minutesByDay: {
                ...r.minutesByDay,
                [day]: (r.minutesByDay[day] || 0) + runningMinutes,
              },
            }
          : r,
      )
    }
    return [...rows, { key, code, activity, minutesByDay: { [day]: runningMinutes } }]
  }, [rows, runningCell, runningMinutes])

  // Enter-in-Timesheet-system view (ADR-0008): resolve virtual codes to their real code and collapse rows that
  // share one — several fine-grained Walker rows become one real-code × activity line, matching
  // both the server's `derive_checklist` and what gets keyed into the Timesheet system. `checked` (fetched from the
  // checklist endpoint) is already real-code-keyed, so its keys must match these rows' keys. Built
  // from `gridRows` (not raw `rows`) so the running cell is present here too (BIZ-007) — it is
  // excluded from fill order/ticking via `enterRunningCell`, so its live minutes never affect the
  // entered-count arithmetic, only its (tinted, read-only) visibility.
  const checklistRows: PeriodRow[] = useMemo(
    () => resolveChecklistRows(gridRows, codesById),
    [gridRows, codesById],
  )

  // ---- Timesheet period cell drill-down (edit the entries behind a grid cell) ----
  const cellDayIso = (day: number): string => dayIsoByDayOfMonth.get(day) ?? anchor
  const loadCell = (date: string, codeId: string, activity: string) =>
    fetchEntriesRange(date, date)
      .then((es) =>
        setCellEntries(
          es.filter((e) => e.codeId === codeId && e.activity === activity && e.end !== null),
        ),
      )
      .catch((err: unknown) => notifyError(errorMessage(err, 'Could not load these entries.')))
  const openCell = (rowKey: string, day: number) => {
    const bar = rowKey.indexOf('|')
    const codeId = rowKey.slice(0, bar)
    const activity = rowKey.slice(bar + 1)
    const date = cellDayIso(day)
    const code = codesById[codeId]
    const title = `${code?.name ?? code?.number ?? ''} · ${activity} · ${dayLabel(date)}`
    setCellDrill({ date, codeId, activity, title })
    void loadCell(date, codeId, activity)
  }
  const refreshCell = () => {
    if (cellDrill) void loadCell(cellDrill.date, cellDrill.codeId, cellDrill.activity)
  }

  // Click an empty Timesheet period cell → open "New entry" prefilled with that cell's date + row's
  // code/activity, and the most recent comment used on that code × activity (blank if none).
  const openAddInCell = (rowKey: string, day: number) => {
    const bar = rowKey.indexOf('|')
    const codeId = rowKey.slice(0, bar)
    const activity = rowKey.slice(bar + 1)
    const recent = entries
      .filter((e) => e.codeId === codeId && e.activity === activity && e.description.trim() !== '')
      .sort((a, b) => (a.date === b.date ? b.start - a.start : b.date.localeCompare(a.date)))[0]
    setAddDraft({
      id: 'new',
      date: cellDayIso(day),
      start: 9 * 60,
      end: 10 * 60,
      codeId,
      activity,
      description: recent?.description ?? '',
    })
  }

  // ---- Checklist (server-backed — BIZ-005) ----
  const applyChecklistChange = (next: ChecklistState) => {
    const date = periodStartFor(periodScheme, anchor)
    const keys = new Set([...Object.keys(checked), ...Object.keys(next)])
    keys.forEach((key) => {
      const before = !!checked[key]
      const after = !!next[key]
      if (before === after) return
      const mark = parseChecklistKey(key)
      if (mark) {
        apiToggleChecklist(date, { ...mark, entered: after }).catch((err: unknown) =>
          notifyError(errorMessage(err, 'Could not save the checklist change.')),
        )
      }
    })
    setChecked(next)
  }
  const resetChecklistMarks = () => {
    apiResetChecklist(periodStartFor(periodScheme, anchor))
      .then(() => setChecked({}))
      .catch((err: unknown) => notifyError(errorMessage(err, 'Could not reset the checklist.')))
  }

  // ---- Settings (server-backed — BIZ-006, BIZ-027, BIZ-032) ----
  const toggleWorkday = (index: number) => {
    const next = workdays.map((worked, j) => (j === index ? !worked : worked))
    setWorkdays(next)
    apiUpdateSettings(next, density, periodScheme, theme).catch((err: unknown) =>
      notifyError(errorMessage(err, 'Could not save your work rhythm.')),
    )
  }
  const changeDensity = (value: Density) => {
    setDensity(value)
    apiUpdateSettings(workdays, value, periodScheme, theme).catch((err: unknown) =>
      notifyError(errorMessage(err, 'Could not save the density setting.')),
    )
  }
  // Changing the period scheme reshapes the Timesheet period view immediately (BIZ-027): state
  // updates first, so `days`/the grid effect recompute with no stale cached period and no reload.
  const changePeriodScheme = (value: PeriodScheme) => {
    setPeriodScheme(value)
    apiUpdateSettings(workdays, density, value, theme).catch((err: unknown) =>
      notifyError(errorMessage(err, 'Could not save the Timesheet period scheme.')),
    )
  }
  // Changing the theme applies immediately (BIZ-032): state updates first, so the `data-theme`
  // effect above re-resolves and repaints with no reload, then persists to the server.
  const changeTheme = (value: Theme) => {
    setTheme(value)
    writeCachedThemePreference(value)
    apiUpdateSettings(workdays, density, periodScheme, value).catch((err: unknown) =>
      notifyError(errorMessage(err, 'Could not save the theme.')),
    )
  }
  const addAbsence = (date: string, reason: string) => {
    apiAddAbsence(date, reason)
      .then((s) => setAbsences(s.absences))
      .catch((err: unknown) => notifyError(errorMessage(err, 'Could not add the absence.')))
  }
  const removeAbsence = (date: string) => {
    apiRemoveAbsence(date)
      .then((s) => setAbsences(s.absences))
      .catch((err: unknown) => notifyError(errorMessage(err, 'Could not remove the absence.')))
  }

  // Group the tracker window's completed entries by day, most recent first.
  const trackerGroups: DayGroup[] = (() => {
    const byDate = new Map<string, Entry[]>()
    for (const entry of entries) {
      if (entry.end === null) continue // the running entry lives in the TimerBar
      const list = byDate.get(entry.date) ?? []
      list.push(entry)
      byDate.set(entry.date, list)
    }
    return [...byDate.keys()]
      .sort()
      .reverse()
      .map((date) => {
        const dayEntries = byDate
          .get(date)!
          .slice()
          .sort((a, b) => a.start - b.start)
        const total = dayEntries.reduce((s, e) => s + Math.max(0, (e.end ?? e.start) - e.start), 0)
        return {
          date,
          label: dayLabel(date),
          totalLabel: formatDuration(total),
          entries: dayEntries,
        }
      })
  })()

  const periodLabel = periodLabelFor(periodScheme, anchor)

  const timerBar = (
    <TimerBar
      running={running !== null}
      elapsedSeconds={elapsedSeconds}
      description={draft.description}
      code={timerCode}
      activity={draft.activity}
      suggestions={suggestions}
      onDescriptionChange={(v) => setDraft((d) => ({ ...d, description: v }))}
      onStart={startTimer}
      onStop={stopTimer}
      onCancel={cancelTimer}
      onSwitchTask={() => setPicker({ target: 'timer' })}
      onSubmitDescription={() => startTimerWithDescription(draft.description)}
      taskId={running?.taskId ?? null}
      onComplete={completeTimer}
      startMinute={running?.start ?? null}
      onEditStart={(minute) => {
        if (running) {
          apiPatchEntry(running.id, { start: minute })
            .then(reload)
            .catch((err: unknown) => notifyError(errorMessage(err, 'Could not save the entry.')))
        }
      }}
      onPickSuggestion={(s) => {
        setDraft({ codeId: s.codeId, activity: s.activity, description: s.description })
        if (running) {
          apiPatchEntry(running.id, {
            codeId: s.codeId,
            activity: s.activity,
            description: s.description,
          })
            .then(reload)
            .catch((err: unknown) => notifyError(errorMessage(err, 'Could not save the entry.')))
        }
      }}
    />
  )

  return (
    <AppShell
      route={route}
      onNavigate={setRoute}
      timer={timerBar}
      uncategorizedCount={uncategorizedCount}
      user={user}
    >
      {route === 'tracker' && (
        <TrackerScreen
          groups={trackerGroups}
          codesById={codesById}
          loading={entriesLoading}
          onEditEntry={(id, patch) =>
            apiPatchEntry(id, patch)
              .then(reload)
              .catch((err: unknown) => notifyError(errorMessage(err, 'Could not save the entry.')))
          }
          onCategorizeEntry={(id) => setPicker({ target: id })}
          onOpenEntry={(id) => {
            const found = entries.find((e) => e.id === id)
            if (found) setEditorEntry(found)
          }}
          onResumeEntry={resumeEntry}
          onDeleteEntry={(id) => {
            const found = entries.find((e) => e.id === id)
            if (found) deleteEntryWithUndo(found)
          }}
          onLoadEarlier={() => setTrackerFrom((f) => addDays(f, -14))}
          onAddEntry={addEntry}
        />
      )}
      {route === 'period' && (
        <PeriodScreen
          periodLabel={periodLabel}
          days={days}
          reviewRows={gridRows}
          enterRows={checklistRows}
          runningCell={runningCell ? { key: runningCell.key, day: runningCell.day } : null}
          enterRunningCell={enterRunningCell}
          checked={checked}
          onPrev={() => setAnchor((a) => shiftPeriod(periodScheme, a, -1))}
          onNext={() => setAnchor((a) => shiftPeriod(periodScheme, a, 1))}
          onThis={() => setAnchor(TODAY)}
          onOpenCell={openCell}
          onAddCell={openAddInCell}
          onAddEntry={openAddEntryInPeriod}
          onChecklistChange={applyChecklistChange}
          onChecklistReset={resetChecklistMarks}
        />
      )}
      {route === 'tasks' && (
        <TasksScreen
          tasks={tasks}
          codesById={codesById}
          loading={tasksLoading}
          onNew={() => setTaskPanel({ task: null })}
          onOpenTask={(task) => setTaskPanel({ task })}
          onStartTask={startTaskTimer}
          onMoveTask={moveTask}
        />
      )}
      {route === 'codes' && (
        <CodeCatalogScreen
          codes={codes}
          loading={codesLoading}
          onNew={() => setEditor({ code: null })}
          onNewVirtual={() => setVirtualEditor({ code: null })}
          onEdit={(code) => setEditor({ code })}
          onEditVirtual={(code) => setVirtualEditor({ code })}
          onDelete={deleteCode}
          isCodeInUse={isCodeInUse}
          onImport={importCatalogFile}
          importStatus={importMessage}
          onSearchReference={searchReference}
          onAddCode={(number) =>
            apiAddCodeFromReference(number)
              .then(reloadCodes)
              .catch((err: unknown) => notifyError(errorMessage(err, 'Could not add the code.')))
          }
        />
      )}
      {route === 'settings' && (
        <SettingsScreen
          workdays={workdays}
          onToggleWorkday={toggleWorkday}
          density={density}
          onDensityChange={changeDensity}
          periodScheme={periodScheme}
          onPeriodSchemeChange={changePeriodScheme}
          theme={theme}
          onThemeChange={changeTheme}
          absences={absences}
          onAddAbsence={addAbsence}
          onRemoveAbsence={removeAbsence}
        />
      )}

      {addDraft && (
        <EntryEditor
          entry={addDraft}
          code={addDraft.codeId ? (codesById[addDraft.codeId] ?? null) : null}
          title="New entry"
          onSave={saveAddDraft}
          onOpenPicker={() => setPicker({ target: 'new' })}
          onClose={() => setAddDraft(null)}
        />
      )}

      {picker && (
        <CodePicker
          title={
            picker.target === 'timer'
              ? 'Switch task'
              : picker.target === 'new'
                ? 'Pick code & activity'
                : picker.target === 'task'
                  ? 'Start task — pick an activity'
                  : 'Categorize entry'
          }
          codes={
            // Start-from-Task (BIZ-023): the Task's code is prefilled — scope the picker to just
            // that code so only the Activity remains to be chosen. An orphan Task (no code) still
            // gets the full picker, exactly like "Switch task".
            picker.target === 'task' && pendingTaskStart?.codeId
              ? codes.filter((c) => c.id === pendingTaskStart.codeId)
              : codes
          }
          onCreateNew={
            picker.target === 'task' ? undefined : (q) => setEditor({ code: null, initialName: q })
          }
          onCreateNewVirtual={
            picker.target === 'task'
              ? undefined
              : () => {
                  const reopenPicker = picker.target
                  setPicker(null)
                  setVirtualEditor({ code: null, reopenPicker })
                }
          }
          onSearchReference={picker.target === 'task' ? undefined : searchReference}
          onAddFromReference={(number) =>
            apiAddCodeFromReference(number)
              .then(reloadCodes)
              .catch((err: unknown) => notifyError(errorMessage(err, 'Could not add the code.')))
          }
          onPick={(codeId, activity) => {
            // This picker always chooses an activity (never code-only, BIZ-037); the guard narrows
            // `activity` to a string for the entry/timer paths below.
            if (activity === undefined) return
            // Prefill from the last comment used on this code (real or virtual) + activity, when one
            // exists (BIZ-013) — otherwise leave the description as it was.
            const lastDescription = lastDescriptionFor(entries, codeId, activity)
            if (picker.target === 'timer') {
              pickTask(codeId, activity)
              if (lastDescription !== null) {
                setDraft((d) => ({ ...d, description: lastDescription }))
                if (running) {
                  apiPatchEntry(running.id, { description: lastDescription })
                    .then(reload)
                    .catch((err: unknown) =>
                      notifyError(errorMessage(err, 'Could not save the entry.')),
                    )
                }
              }
            } else if (picker.target === 'new') {
              setAddDraft((d) =>
                d ? { ...d, codeId, activity, description: lastDescription ?? d.description } : d,
              )
            } else if (picker.target === 'task') {
              const task = pendingTaskStart
              if (task) {
                setDraft({ codeId, activity, description: task.title })
                apiSwitchTimer({ codeId, activity, description: task.title, taskId: task.id })
                  .then(() => Promise.all([reload(), reloadTasks()]))
                  .catch((err: unknown) =>
                    notifyError(errorMessage(err, 'Could not start the timer.')),
                  )
              }
              setPendingTaskStart(null)
            } else {
              apiPatchEntry(picker.target, {
                codeId,
                activity,
                ...(lastDescription !== null ? { description: lastDescription } : {}),
              })
                .then(reload)
                .catch((err: unknown) =>
                  notifyError(errorMessage(err, 'Could not save the entry.')),
                )
            }
            setPicker(null)
          }}
          onClose={() => {
            setPicker(null)
            setPendingTaskStart(null)
          }}
        />
      )}

      {editor && (
        <CodeEditor
          code={editor.code}
          initialName={editor.initialName}
          onSave={saveCode}
          onDelete={
            editor.code && !isCodeInUse(editor.code.id) ? () => deleteCode(editor.code!) : undefined
          }
          onClose={() => setEditor(null)}
        />
      )}

      {virtualEditor && (
        <VirtualCodeEditor
          code={virtualEditor.code}
          realCodes={codes.filter((c) => !c.isVirtual)}
          onSave={saveVirtualCode}
          onDelete={
            virtualEditor.code && !isCodeInUse(virtualEditor.code.id)
              ? () => deleteCode(virtualEditor.code!)
              : undefined
          }
          onClose={() => setVirtualEditor(null)}
        />
      )}

      {editorEntry && (
        <EntryEditor
          entry={editorEntry}
          code={editorEntry.codeId ? (codesById[editorEntry.codeId] ?? null) : null}
          onSave={(patch) =>
            apiPatchEntry(editorEntry.id, patch)
              .then(() => {
                refreshCell()
                return reload()
              })
              .catch((err: unknown) => notifyError(errorMessage(err, 'Could not save the entry.')))
          }
          onOpenPicker={() => {
            setPicker({ target: editorEntry.id })
            setEditorEntry(null)
          }}
          onDelete={() => deleteEntryWithUndo(editorEntry, refreshCell)}
          onClose={() => setEditorEntry(null)}
        />
      )}

      {taskPanel && (
        <TaskPanel
          task={taskPanel.task}
          codes={codes}
          tagSuggestions={taskTags}
          onSave={saveTask}
          onDelete={taskPanel.task ? () => deleteTask(taskPanel.task!) : undefined}
          onClose={() => setTaskPanel(null)}
          onSearchReference={searchReference}
          onAddFromReference={(number) =>
            apiAddCodeFromReference(number).then((added) => {
              void reloadCodes()
              return added
            })
          }
          onCreateNew={(q) => setEditor({ code: null, initialName: q })}
          onCreateNewVirtual={() => setVirtualEditor({ code: null, reopenPicker: null })}
        />
      )}

      {cellDrill && (
        <CellEntriesModal
          title={cellDrill.title}
          entries={cellEntries}
          codesById={codesById}
          onEditEntry={(id, patch) =>
            apiPatchEntry(id, patch)
              .then(() => {
                refreshCell()
                return reload()
              })
              .catch((err: unknown) => notifyError(errorMessage(err, 'Could not save the entry.')))
          }
          onCategorizeEntry={(id) => setPicker({ target: id })}
          onOpenEntry={(id) => {
            const found = cellEntries.find((e) => e.id === id)
            if (found) setEditorEntry(found)
          }}
          onResumeEntry={resumeEntry}
          onDeleteEntry={(id) => {
            const found = cellEntries.find((e) => e.id === id)
            if (found) deleteEntryWithUndo(found, refreshCell)
          }}
          onClose={() => setCellDrill(null)}
        />
      )}

      {pendingDelete && (
        <div className="wk-undo-toast" role="status">
          <span>Entry deleted.</span>
          <button type="button" className="wk-undo-toast-action" onClick={undoDelete}>
            Undo
          </button>
        </div>
      )}
    </AppShell>
  )
}
