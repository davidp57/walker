import { useEffect, useMemo, useRef, useState } from 'react'
import './styles/tokens.css'
import './styles/walker.css'
import { AppShell, type Route, type ShellUser } from './components/AppShell'
import { StaleTimerModal } from './components/StaleTimerModal'
import { TimerBar } from './components/TimerBar'
import { BlockingEntriesModal } from './components/BlockingEntriesModal'
import { CodePicker } from './components/CodePicker'
import { CodeTotalsModal } from './components/CodeTotalsModal'
import { RetireCodeModal } from './components/RetireCodeModal'
import { ImportCatalogModal } from './components/ImportCatalogModal'
import { OrphanedCodesModal } from './components/OrphanedCodesModal'
import { CodeEditor, type CodePrefill } from './components/CodeEditor'
import { VirtualCodeEditor } from './components/VirtualCodeEditor'
import { EntryEditor } from './components/EntryEditor'
import { BreakModal, type BreakDraft } from './components/BreakModal'
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
  BlockingEntries,
  ChecklistState,
  DayColumn,
  Density,
  Entry,
  PeriodRow,
  PeriodScheme,
  ReferenceCode,
  Task,
  TaskState,
  TaskSuggestion,
  SwitchTarget,
  Theme,
  TimesheetCode,
  ViewPreferences,
} from './types'
import { DEFAULT_TASK_STATES, DEFAULT_VIEW_PREFERENCES } from './types'
import { resolveChecklistRows } from './lib/checklist'
import { elapsedSecondsSince, formatDuration, formatLocalMoment, isoDate } from './lib/time'
import { useToday } from './lib/useToday'
import {
  applyResolvedTheme,
  readCachedThemePreference,
  resolveTheme,
  writeCachedThemePreference,
} from './lib/theme'
import { shouldRetagInPlace } from './lib/timer'
import { lastDescriptionFor, soleActivity } from './lib/tasks'
import { describeDue } from './lib/dueDate'
import { ToastProvider } from './lib/toast'
import type { CodeSweep, OrphanedCode } from './lib/api'
import { errorMessage, useToast } from './lib/toastContext'
import {
  addAbsence as apiAddAbsence,
  addBackingFromReference as apiAddBackingFromReference,
  addTaskState as apiAddTaskState,
  ApiError,
  completeTimer as apiCompleteTimer,
  createCode as apiCreateCode,
  createEntry as apiCreateEntry,
  createTask as apiCreateTask,
  createVirtualCode as apiCreateVirtualCode,
  deleteBlockingEntries as apiDeleteBlockingEntries,
  deleteCode as apiDeleteCode,
  fetchBlockingEntries,
  fetchCodeTotals,
  setCodeObsolete as apiSetCodeObsolete,
  reassignBlockingEntries as apiReassignBlockingEntries,
  deleteEntry as apiDeleteEntry,
  deleteTask as apiDeleteTask,
  deleteTaskState as apiDeleteTaskState,
  fetchChecklist,
  fetchCodes,
  fetchEntriesRange,
  fetchLikelyCodes,
  fetchSwitchTargets,
  fetchHealth,
  fetchPeriod,
  fetchSettings,
  fetchTaskTags,
  fetchTasks,
  fetchUser,
  importCatalog as apiImportCatalog,
  insertBreak as apiInsertBreak,
  mergeEntries as apiMergeEntries,
  patchEntry as apiPatchEntry,
  patchViewPreferences as apiPatchViewPreferences,
  removeAbsence as apiRemoveAbsence,
  renameTaskState as apiRenameTaskState,
  reorderTaskStates as apiReorderTaskStates,
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

// The one thing that genuinely blocks a code deletion client-side (TEC-016): virtual codes pointing
// at it. Entries do not — the SPA only sees the loaded date window, so the server decides and a 409
// opens the resolve flow (BIZ-088). The catalog states the same block in its own tooltip; this is
// the editors' phrasing of it.
const VIRTUAL_CHILDREN_BLOCK = 'Virtual codes point at this one — delete those first.'

// The moment the code picker's likely-codes band ranks against (BIZ-083, ADR-0015). Local wall clock,
// matching how an Entry stores its `date` + minutes-since-midnight.
// BIZ-093 (ADR-0016): how often the Switch blocks are recomputed. A quarter of an hour is well under
// the width of the habit model's kernel, so the band never lags the time of day noticeably, and it
// costs one small request per idle quarter-hour.
const SWITCH_REFRESH_MS = 15 * 60 * 1000

const momentNow = (): string => {
  const d = new Date()
  return formatLocalMoment(isoDate(d), d.getHours() * 60 + d.getMinutes())
}
// The moment of an existing Entry — the context when categorizing one from a list or the drill-down.
const momentOf = (entry: Entry | undefined): string | null =>
  entry ? formatLocalMoment(entry.date, entry.start) : null

// Shift an ISO date by whole days; label a day for the tracker's section headers.
const addDays = (iso: string, delta: number): string => {
  const [y, m, d] = iso.split('-').map(Number)
  return isoDate(new Date(y, m - 1, d + delta))
}
const dayLabel = (iso: string, today: string): string => {
  if (iso === today) return 'Today'
  if (iso === addDays(today, -1)) return 'Yesterday'
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
  const { notifyError, notify } = useToast()
  // BIZ-091: the civil day, alive. Left as a module constant it froze at page load, so an app open
  // across midnight kept loading yesterday's window and labelling days one off — and could never
  // notice that the running Timer had drifted into a past day.
  const today = useToday()
  const [route, setRoute] = useState<Route>('tracker')
  const [user, setUser] = useState<ShellUser | undefined>(undefined)
  const [codes, setCodes] = useState<TimesheetCode[]>([])
  const [codesLoading, setCodesLoading] = useState(true)
  const [entries, setEntries] = useState<Entry[]>([])
  const [entriesLoading, setEntriesLoading] = useState(true)
  const [draft, setDraft] = useState<TimerDraft>(EMPTY_DRAFT)
  const [now, setNow] = useState(Date.now())
  const [anchor, setAnchor] = useState<string>(() => isoDate(new Date()))
  const [matrix, setMatrix] = useState<Record<string, Record<number, number>>>({})
  // BIZ-065: parallel per-cell "has a manual entry" matrix, same `${codeId}|${activity}` keys.
  const [manualMatrix, setManualMatrix] = useState<Record<string, Record<number, boolean>>>({})
  // BIZ-070: per-day minutes tracked but excluded from the matrix (missing a code or activity).
  const [uncategorizedByDay, setUncategorizedByDay] = useState<Record<number, number>>({})
  const [checked, setChecked] = useState<ChecklistState>({})
  // BIZ-093 (ADR-0016): the codes the Switch blocks offer. Fetched, not derived — the band composes
  // the habit ranking with a recency fill, which is domain logic and lives server-side.
  const [switchTargets, setSwitchTargets] = useState<SwitchTarget[]>([])
  // `at` is the moment the picker's likely-codes band ranks against (BIZ-083, ADR-0015): "now" from
  // the Timer, the date + start being edited elsewhere. Null when there is no usable context.
  const [picker, setPicker] = useState<{ target: 'timer' | string; at: string | null } | null>(null)
  // `prefill` populates the editor from a reference-catalog entry being activated (BIZ-049);
  // `onActivated` is the continuation run after the real code is saved (e.g. select it as a virtual
  // code's backing, or set a task's code).
  const [editor, setEditor] = useState<{
    code: TimesheetCode | null
    initialName?: string
    prefill?: CodePrefill
    onActivated?: (code: TimesheetCode) => void
  } | null>(null)
  // `reopenPicker` is set when the virtual-code editor was opened from CodePicker's "create on the
  // fly" action (BIZ-013): on save, the picker reopens on the same target so the newly created
  // virtual code can be picked in one more click ("used immediately" — see saveVirtualCode below).
  const [virtualEditor, setVirtualEditor] = useState<{
    code: TimesheetCode | null
    reopenPicker?: string | null
    // The reopened picker's likely-codes context, carried through so the band survives the detour
    // (BIZ-083) rather than silently falling back to "now" for a past Entry.
    reopenAt?: string | null
  } | null>(null)
  // BIZ-088: the code whose deletion is blocked by Entries, with what the server says is in the way.
  const [blocking, setBlocking] = useState<{
    code: TimesheetCode
    blocking: BlockingEntries
  } | null>(null)
  // BIZ-089: the code whose time totals are being read ("how much time did you spend on X?").
  const [totalsCode, setTotalsCode] = useState<TimesheetCode | null>(null)
  // BIZ-090: the code being retired, while its confirm + optional sweep is on screen.
  const [retiringCode, setRetiringCode] = useState<TimesheetCode | null>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  // TEC-019: the catalog file chosen in the OS picker, waiting on the import modal's confirmation.
  const [pendingImport, setPendingImport] = useState<File | null>(null)
  // BIZ-092: active codes the last complete-catalog import no longer found, awaiting a decision.
  const [orphanedCodes, setOrphanedCodes] = useState<OrphanedCode[]>([])
  // The orphan whose dependent virtual codes are being repointed, while the backing picker is open.
  const [repointTarget, setRepointTarget] = useState<OrphanedCode | null>(null)
  const [trackerFrom, setTrackerFrom] = useState<string>(() => addDays(isoDate(new Date()), -13))
  const [editorEntry, setEditorEntry] = useState<Entry | null>(null)
  // BIZ-076: the entry a break is being punched into, or null when the break modal is closed.
  const [breakTarget, setBreakTarget] = useState<Entry | null>(null)
  // BIZ-091: the stale-Timer entry whose prompt was postponed this session (see `staleTimer`).
  const [staleDismissed, setStaleDismissed] = useState<string | null>(null)
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
  const [taskPanel, setTaskPanel] = useState<{
    task: Task | null
    initialCodeId?: string | null
  } | null>(null)

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
  // BIZ-053: per-user view preferences (Tasks view/group/sort, period mode, Done collapse). Seeded
  // with the defaults; the settings fetch below replaces them. Writes are optimistic + debounced.
  const [viewPreferences, setViewPreferences] = useState<ViewPreferences>(DEFAULT_VIEW_PREFERENCES)
  const viewPrefsTimer = useRef<number | null>(null)
  // BIZ-056/057: the user's ordered task states. Seeded with the defaults for the first paint; the
  // settings fetch replaces them, and every CRUD op returns the fresh list.
  const [taskStates, setTaskStates] = useState<TaskState[]>(DEFAULT_TASK_STATES)

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
        setViewPreferences(s.viewPreferences)
        setTaskStates(s.taskStates)
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
    fetchEntriesRange(trackerFrom, today)
      .then(setEntries)
      .catch((err: unknown) => notifyError(errorMessage(err, 'Could not load your entries.')))
      .finally(() => setEntriesLoading(false))
  }, [trackerFrom, today, notifyError])

  // Load the Timesheet period grid + checklist whenever the anchored period, scheme, or entries
  // change — a scheme change reshapes the view immediately (BIZ-027): no stale cached period.
  useEffect(() => {
    const ref = periodStartFor(periodScheme, anchor)
    fetchPeriod(ref)
      .then(({ minutes, manual, uncategorizedByDay: uncat }) => {
        setMatrix(minutes)
        setManualMatrix(manual)
        setUncategorizedByDay(uncat)
      })
      .catch((err: unknown) =>
        notifyError(errorMessage(err, 'Could not load the Timesheet period grid.')),
      )
    fetchChecklist(ref)
      .then(setChecked)
      .catch((err: unknown) => notifyError(errorMessage(err, 'Could not load the checklist.')))
  }, [anchor, periodScheme, entries, notifyError])

  const reload = () =>
    fetchEntriesRange(trackerFrom, today)
      .then(setEntries)
      .catch((err: unknown) => notifyError(errorMessage(err, 'Could not refresh your entries.')))

  const running = entries.find((e) => e.end === null) ?? null
  const runningId = running?.id ?? null
  // BIZ-091: a Timer still running from an earlier day. Walker cannot know when the user stopped and
  // never invents a duration (ADR-0005), so it asks — the old behaviour closed such an entry with
  // *today's* minute, writing an end before its start and reducing a tracked day to 0:00. Dismissible
  // ("Later"), per entry, so the prompt is not a trap; it returns on the next load.
  const staleTimer = running && running.date !== today ? running : null
  const staleTimerPrompt = staleTimer && staleTimer.id !== staleDismissed ? staleTimer : null

  // Entries not fully categorized (BIZ-010, BIZ-070) — missing a code *or* an activity, so they
  // won't reach the Timesheet-system matrix. Surfaced as a live count in the shell so nothing is left
  // incomplete before the Timesheet period closes. Mirrors EntryRow's own `flagged` rule.
  const uncategorizedCount = useMemo(
    () => entries.filter((e) => !e.codeId || !e.activity).length,
    [entries],
  )

  // Tasks needing attention (BIZ-062): overdue or due today, excluding the terminal (done) state
  // (ADR-0011). Drives the Tasks nav badge — the always-visible, well-placed indicator (the old
  // one-time startup toast duplicated it and was removed).
  const dueTasks = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const terminalId = taskStates[taskStates.length - 1]?.id
    return tasks
      .filter((t) => t.dueDate !== null && t.status !== terminalId)
      .map((t) => describeDue(t.dueDate as string, today))
      .filter((d) => d.overdue || d.dueToday)
  }, [tasks, taskStates])
  const tasksDueCount = dueTasks.length

  // Tick the clock every second only while a timer is running.
  useEffect(() => {
    if (runningId == null) return
    const iv = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(iv)
  }, [runningId])

  // BIZ-093 (ADR-0016): the Switch blocks follow the time of day, so they need a slow tick of their
  // own — the second-by-second clock above runs only while a Timer runs, and the band must keep
  // ageing while the app sits idle.
  const [switchTick, setSwitchTick] = useState(0)
  useEffect(() => {
    const iv = window.setInterval(() => setSwitchTick((t) => t + 1), SWITCH_REFRESH_MS)
    return () => window.clearInterval(iv)
  }, [])

  const codesById = useMemo(() => Object.fromEntries(codes.map((c) => [c.id, c])), [codes])
  // BIZ-075 (ADR-0014): backing-only real codes exist only to resolve a virtual code's Timesheet
  // export; they are hidden from every user-facing surface (catalog + pickers). `codesById` stays
  // built from the full set so a checklist line still resolves its number/label by id.
  // The catalog shows every code the user owns except the hidden backings (BIZ-075, ADR-0014); it
  // filters retired ones itself, behind its toggle. Every *picker* takes `pickableCodes`, which drops
  // retired codes outright — a retired code you can still click is not retired (BIZ-090).
  const visibleCodes = useMemo(() => codes.filter((c) => !c.backingOnly), [codes])
  const pickableCodes = useMemo(() => visibleCodes.filter((c) => !c.obsolete), [visibleCodes])

  // BIZ-085: while an Entry is running it is the **single source of truth** for its categorization.
  // Every surface can edit it — the Activity list, the cell drill-down, the full entry editor — and
  // they all write the Entry, so reading the Timer chip from anywhere else guarantees a desync.
  // `draft` only composes the *next* segment, for when nothing is running.
  const timerCodeId = running ? running.codeId : draft.codeId
  const timerActivity = running ? running.activity : draft.activity
  const timerCode = timerCodeId ? (codesById[timerCodeId] ?? null) : null
  const elapsedSeconds = running ? elapsedSecondsSince(running.date, running.start, now) : 0
  const runningMinutes = Math.floor(elapsedSeconds / 60)

  // The description is the one field the bar can legitimately lead: it is typed live while the Timer
  // runs. So it is a local buffer over the running Entry's — **mirroring** the Entry until the user
  // types in it, and only then winning, until the segment closes.
  //
  // `descriptionTouched` is what tells those two states apart, and it has to be a flag: comparing the
  // buffer against the Entry cannot distinguish "the user typed" from "another surface wrote", and
  // guessing wrong destroys data in one direction or the other — a stale buffer blanking a description
  // set from the Activity list, or a reload wiping what is half-typed (BIZ-085).
  const descriptionTouched = useRef(false)
  const resetDraft = (next: TimerDraft) => {
    descriptionTouched.current = false
    setDraft(next)
  }
  useEffect(() => {
    if (!running) return
    if (descriptionTouched.current) return
    const stored = running.description
    setDraft((d) => (d.description === stored ? d : { ...d, description: stored }))
  }, [running])

  // ---- Timer operations (server-backed) ----
  // Capture-first (ADR-0006): Start needs no input. But anything already composed on the bar — a
  // pre-picked code, a typed comment (Enter-to-start, BIZ-009) — is attributed to the new Entry
  // straight away, so the Entry is the source of truth from its very first moment (BIZ-085). An
  // untouched bar patches nothing at all.
  const startTimer = () => {
    apiStartTimer()
      .then((created) => {
        const composed = {
          codeId: draft.codeId,
          activity: draft.activity,
          description: draft.description,
        }
        const nothingComposed =
          composed.codeId === null &&
          composed.activity === null &&
          composed.description.trim() === ''
        if (nothingComposed) return created
        return apiPatchEntry(created.id, composed).catch((err: unknown) => {
          // The Timer *did* start — capture-first is never undone by this — so report the failure on
          // its own terms rather than as "could not start". The reload then shows the truth: the chip
          // reads the Entry now, so it self-corrects to Uncategorized instead of lying (BIZ-085).
          notifyError(errorMessage(err, 'Timer started, but its code could not be saved.'))
          return created
        })
      })
      .then(reload)
      .catch((err: unknown) => notifyError(errorMessage(err, 'Could not start the timer.')))
  }
  // Shared by Stop and Complete: the only thing left to save when closing a segment is the
  // description, and only when the user actually typed it on the bar. The code and activity are
  // already on the Entry — pushing the bar's copy of them here is exactly what used to wipe a
  // categorization made from any other surface (BIZ-085).
  const saveRunningDescription = (entry: Entry): Promise<unknown> =>
    descriptionTouched.current
      ? apiPatchEntry(entry.id, { description: draft.description })
      : Promise.resolve()
  const stopTimer = () => {
    if (!running) return
    saveRunningDescription(running)
      .then(() => apiStopTimer())
      .then(() => {
        resetDraft(EMPTY_DRAFT)
        return reload()
      })
      .catch((err: unknown) => notifyError(errorMessage(err, 'Could not stop the timer.')))
  }
  // Complete (BIZ-023): stop the Timer and mark its linked Task Done, in one call — closing the
  // segment saves exactly what Stop does, so nothing typed is lost.
  const completeTimer = () => {
    if (!running) return
    saveRunningDescription(running)
      .then(() => apiCompleteTimer())
      .then(() => {
        resetDraft(EMPTY_DRAFT)
        return Promise.all([reload(), reloadTasks()])
      })
      .catch((err: unknown) => notifyError(errorMessage(err, 'Could not complete the task.')))
  }
  // Start a Timer from a Task in one click, no picker (BIZ-050): description = the Task's title,
  // code = the Task's code. The Activity is auto-filled only when the code has exactly one; with no
  // code or several activities it's left to categorize later. If a Timer is already running the
  // click switches (re-tagging an empty stub in place, else closing it and opening a new segment),
  // exactly like resuming an entry. Starting work also advances a to-do Task into progress.
  const startTaskTimer = (task: Task) => {
    const code = task.codeId ? (codesById[task.codeId] ?? null) : null
    const activity = soleActivity(code)
    const category = { codeId: task.codeId, activity, description: task.title, taskId: task.id }
    resetDraft({ codeId: task.codeId, activity, description: task.title })
    const apply =
      running && shouldRetagInPlace(running)
        ? apiPatchEntry(running.id, category)
        : apiSwitchTimer(category)
    apply
      .then(() => Promise.all([reload(), reloadTasks()]))
      .catch((err: unknown) => notifyError(errorMessage(err, 'Could not start the timer.')))
    // Optimistic mirror of the backend's positional nudge (ADR-0011): a Task in the first
    // (initial) state moves to the second when a timer starts on it.
    if (task.status === taskStates[0]?.id && taskStates[1]) moveTask(task, taskStates[1].id)
  }
  const cancelTimer = () => {
    if (running) {
      apiDeleteEntry(running.id)
        .then(() => {
          resetDraft(EMPTY_DRAFT)
          return reload()
        })
        .catch((err: unknown) => notifyError(errorMessage(err, 'Could not cancel the timer.')))
    } else {
      resetDraft(EMPTY_DRAFT)
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
        setPicker({ target: 'timer', at: momentNow() })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  // Set/correct the running timer's code + activity — always in place, keeping the same Entry and
  // start (BIZ-058). Editing the running timer never splits; a new segment comes only from an
  // explicit start (Start, Start-from-Task, resume). To split deliberately, stop then start.
  const pickTask = (codeId: string, activity: ActivityName) => {
    setDraft((d) => ({ ...d, codeId, activity }))
    if (running) {
      apiPatchEntry(running.id, { codeId, activity })
        .then(reload)
        .catch((err: unknown) => notifyError(errorMessage(err, 'Could not save the entry.')))
    }
  }

  // BIZ-093 (ADR-0016): one click on a Switch block moves the Timer onto that code. Same split rule
  // as resuming an entry or starting a Task — an empty capture stub is re-tagged in place so its
  // elapsed minutes are attributed, real work is closed and a new segment opens. The block carries no
  // description, so anything typed on the bar is saved onto the segment that closes, exactly as Stop
  // does; the new segment starts blank rather than inheriting a comment written about the old one.
  const switchToTarget = (target: SwitchTarget, activity: ActivityName) => {
    // Read the bar's pending description *before* resetting the draft — `resetDraft` clears the
    // "the user typed this" flag, so asking afterwards always answers no and the text is lost.
    const typed = descriptionTouched.current ? draft.description : null
    resetDraft(EMPTY_DRAFT)
    const apply =
      running && shouldRetagInPlace(running)
        ? // The stub keeps its own minutes, so it keeps what was typed about them too.
          apiPatchEntry(running.id, {
            codeId: target.codeId,
            activity,
            ...(typed !== null ? { description: typed } : {}),
          })
        : (running && typed !== null
            ? apiPatchEntry(running.id, { description: typed })
            : Promise.resolve()
          ).then(() => apiSwitchTimer({ codeId: target.codeId, activity, description: '' }))
    apply
      .then(reload)
      .catch((err: unknown) => notifyError(errorMessage(err, 'Could not switch the timer.')))
  }

  // The band is refetched when the clock ages past a quarter-hour, when the running code changes
  // (it is excluded server-side), and whenever entries move — a closed segment is fresh recency.
  const switchCount = viewPreferences.switch_count
  const runningCodeId = running?.codeId ?? null
  useEffect(() => {
    if (switchCount <= 0) {
      setSwitchTargets([])
      return
    }
    let cancelled = false
    fetchSwitchTargets(momentNow(), switchCount, runningCodeId)
      .then((rows) => !cancelled && setSwitchTargets(rows))
      .catch(() => !cancelled && setSwitchTargets([]))
    return () => {
      cancelled = true
    }
  }, [switchCount, runningCodeId, switchTick, entries.length, codes.length])

  const resumeEntry = (id: string) => {
    const e = entries.find((x) => x.id === id)
    if (!e) return
    const category = { codeId: e.codeId, activity: e.activity, description: e.description }
    resetDraft(category)
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
  const addEntry = (date: string = today) => {
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
  // BIZ-076: punch a hole in an entry — split the worked time around the break, optionally filling
  // the hole. One atomic server call, then refresh the tracker (and any open cell drill-down).
  const applyBreak = (entryId: string, draft: BreakDraft) => {
    apiInsertBreak(entryId, {
      breakStartMinute: draft.breakStartMinute,
      breakEndMinute: draft.breakEndMinute,
      timesheetCodeId: draft.timesheetCodeId,
      activity: draft.activity,
    })
      .then(reload)
      .catch((err: unknown) => notifyError(errorMessage(err, 'Could not insert the break.')))
  }
  // BIZ-077: merge two overlapping/adjacent same-code entries into one (the inverse of a break).
  const mergeEntries = (entryId: string, otherId: string) => {
    apiMergeEntries(entryId, otherId)
      .then(reload)
      .catch((err: unknown) => notifyError(errorMessage(err, 'Could not merge the entries.')))
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
  // BIZ-088: which of the two guards applies, so the catalog can treat them differently. Virtual
  // children genuinely block (delete those codes first); entries are only *probably* in the way —
  // this sees the loaded window alone, so the server decides and the ✕ stays clickable.
  const deleteBlockedBy = (id: string): 'entries' | 'virtual' | null => {
    if (codes.some((c) => c.realCodeId === id)) return 'virtual'
    const used =
      entries.some((e) => e.codeId === id) ||
      Object.keys(matrix).some((k) => k.startsWith(`${id}|`))
    return used ? 'entries' : null
  }
  const saveCode = (code: TimesheetCode) => {
    const payload = {
      number: code.number,
      label: code.label,
      name: code.name,
      color: code.color,
      activities: code.activities,
    }
    // Captured now: `setEditor(null)` (in the editor's onClose) runs before this promise resolves.
    const onActivated = editor?.onActivated
    const op = codes.some((c) => c.id === code.id)
      ? apiUpdateCode(code.id, payload)
      : apiCreateCode(payload)
    op.then(async (saved) => {
      await reloadCodes()
      onActivated?.(saved)
    }).catch((err: unknown) => notifyError(errorMessage(err, 'Could not save the code.')))
  }
  // Activate a reference-catalog code through the editor so it gets a deliberate colour (BIZ-049).
  // Idempotent: if the number is already an active real code, open it in edit mode instead of
  // re-creating; `onActivated` (if any) runs once the code is saved.
  const activateReference = (ref: ReferenceCode, onActivated?: (code: TimesheetCode) => void) => {
    const existing = codes.find((c) => !c.isVirtual && c.number === ref.number)
    if (existing) {
      setEditor({ code: existing, onActivated })
      return
    }
    setEditor({
      code: null,
      prefill: { number: ref.number, label: ref.label, name: ref.name, activities: ref.activities },
      onActivated,
    })
  }
  // BIZ-090: retiring can sweep the open period's entries first, so entries are reloaded too.
  const retireCode = (code: TimesheetCode, sweep?: CodeSweep) =>
    apiSetCodeObsolete(code.id, true, sweep)
      .then(() => Promise.all([reloadCodes(), reload()]))
      .then(() => {
        setRetiringCode(null)
        notify(`${code.name} retired.`)
      })
      .catch((err: unknown) => notifyError(errorMessage(err, 'Could not retire the code.')))
  const restoreCode = (code: TimesheetCode) =>
    apiSetCodeObsolete(code.id, false)
      .then(reloadCodes)
      .then(() => notify(`${code.name} is back in your catalog.`))
      .catch((err: unknown) => notifyError(errorMessage(err, 'Could not restore the code.')))

  const deleteCode = (code: TimesheetCode) => {
    apiDeleteCode(code.id)
      .then(reloadCodes)
      .catch((err: unknown) => {
        // BIZ-088: a 409 means Entries are in the way. Rather than report a dead end, open the
        // resolve flow on what the *server* sees — the client only knows the loaded date window.
        if (err instanceof ApiError && err.status === 409) {
          fetchBlockingEntries(code.id)
            .then((blocking) => setBlocking({ code, blocking }))
            .catch(() => notifyError(errorMessage(err, 'Could not delete the code.')))
          return
        }
        notifyError(errorMessage(err, 'Could not delete the code.'))
      })
  }
  // BIZ-088: after resolving, finish what the user actually asked for — deleting the code — instead
  // of leaving them to click ✕ again. Still blocked (another member's entries) keeps the modal open
  // on the refreshed numbers, which now explain why.
  const afterBlockingResolved = (code: TimesheetCode, blocking: BlockingEntries) => {
    reload()
    if (blocking.total > 0) {
      setBlocking({ code, blocking })
      return
    }
    setBlocking(null)
    apiDeleteCode(code.id)
      .then(reloadCodes)
      .then(() => notify(`${code.name} deleted.`))
      .catch((err: unknown) => notifyError(errorMessage(err, 'Could not delete the code.')))
  }
  // Back a virtual code with a reference code that isn't active yet (BIZ-075, ADR-0014): create it as
  // a hidden backing-only real code (no editor, auto colour) and select it — no second dialog, no
  // extra visible code. Idempotent by number server-side.
  const addBackingFromReference = (ref: ReferenceCode, onAdded?: (code: TimesheetCode) => void) => {
    apiAddBackingFromReference(ref.number)
      .then(async (created) => {
        await reloadCodes()
        onAdded?.(created)
      })
      .catch((err: unknown) => notifyError(errorMessage(err, 'Could not add the backing code.')))
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
    const reopenAt = virtualEditor?.reopenAt ?? null
    const op = virtualEditor?.code
      ? apiUpdateVirtualCode(virtualEditor.code.id, input)
      : apiCreateVirtualCode(input)
    return op.then(reloadCodes).then(() => {
      if (reopenTarget !== null) setPicker({ target: reopenTarget, at: reopenAt })
    })
  }
  const importCatalogFile = () => {
    const picker = document.createElement('input')
    picker.type = 'file'
    picker.accept = '.csv,text/csv'
    picker.onchange = () => {
      const file = picker.files?.[0]
      if (!file) return
      // The file is chosen first, then confirmed: the modal names it and carries the one decision
      // the import needs — whether it is the complete catalog (TEC-019).
      setPendingImport(file)
    }
    picker.click()
  }
  const runCatalogImport = (file: File, completeCatalog: boolean): Promise<void> => {
    setPendingImport(null)
    setImportMessage(`Importing "${file.name}"…`)
    return apiImportCatalog(file, completeCatalog)
      .then((summary) => {
        const pruned = summary.removed > 0 ? `, ${summary.removed} removed` : ''
        setImportMessage(
          `Reference catalog: ${summary.created} codes added, ${summary.updated} updated${pruned}. Search below to add codes.`,
        )
        // BIZ-092: a code you still charge to that the complete catalog no longer lists is worth
        // interrupting for — it is almost always a closed charge line, and a hidden backing is
        // something the catalog screen cannot show you on its own.
        if (summary.orphaned.length > 0) setOrphanedCodes(summary.orphaned)
        return reloadCodes()
      })
      .catch((err: unknown) => {
        setImportMessage(`Import failed — ${err instanceof Error ? err.message : String(err)}`)
      })
  }
  const retireOrphanedCode = (orphan: OrphanedCode): Promise<void> =>
    apiSetCodeObsolete(orphan.id, true)
      .then(() => Promise.all([reloadCodes(), reload()]))
      .then(() => {
        setOrphanedCodes((current) => current.filter((c) => c.id !== orphan.id))
        notify(`${orphan.name} retired.`)
      })
      .catch((err: unknown) => notifyError(errorMessage(err, 'Could not retire the code.')))
  /**
   * Point every virtual code that charges through `orphan` at `newRealCodeId` (BIZ-092).
   *
   * Repointing is per-backing, not per-virtual-code: they all charge through the same dead line, so
   * asking once and fixing them together is both fewer steps and less room to leave one behind.
   */
  const repointOrphanedCode = (orphan: OrphanedCode, newRealCodeId: string): Promise<void> =>
    Promise.all(
      orphan.virtualCodes.map((v) =>
        apiUpdateVirtualCode(v.id, {
          realCodeId: newRealCodeId,
          name: v.name,
          color: codes.find((c) => c.id === v.id)?.color ?? '',
        }),
      ),
    )
      .then(() => Promise.all([reloadCodes(), reload()]))
      .then(() => {
        setOrphanedCodes((current) => current.filter((c) => c.id !== orphan.id))
        setRepointTarget(null)
        notify(
          orphan.virtualCodes.length === 1
            ? `${orphan.virtualCodes[0].name} now charges to another code.`
            : `${orphan.virtualCodes.length} codes now charge to another code.`,
        )
      })
      .catch((err: unknown) => notifyError(errorMessage(err, 'Could not repoint the code.')))

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

  // In-kanban state editing (BIZ-057): each op returns the fresh settings; a delete-with-reassign
  // also retags Tasks server-side, so reload them too.
  const stateEdits = {
    onAdd: (label: string) =>
      apiAddTaskState(label)
        .then((s) => setTaskStates(s.taskStates))
        .catch((err: unknown) => notifyError(errorMessage(err, 'Could not add the column.'))),
    onRename: (id: string, label: string) =>
      apiRenameTaskState(id, label)
        .then((s) => setTaskStates(s.taskStates))
        .catch((err: unknown) => notifyError(errorMessage(err, 'Could not rename the column.'))),
    onReorder: (orderedIds: string[]) =>
      apiReorderTaskStates(orderedIds)
        .then((s) => setTaskStates(s.taskStates))
        .catch((err: unknown) => notifyError(errorMessage(err, 'Could not reorder the columns.'))),
    onDelete: (id: string, reassignTo?: string) =>
      apiDeleteTaskState(id, reassignTo)
        .then((s) => {
          setTaskStates(s.taskStates)
          return reloadTasks()
        })
        .catch((err: unknown) => notifyError(errorMessage(err, 'Could not delete the column.'))),
  }

  // BIZ-053: apply a view-preference change optimistically, then persist it debounced (fire-and-
  // forget — the server is the source of truth on the next load, so a dropped write self-heals).
  const updateViewPreferences = (patch: Partial<ViewPreferences>) => {
    const next = { ...viewPreferences, ...patch }
    setViewPreferences(next)
    if (viewPrefsTimer.current != null) window.clearTimeout(viewPrefsTimer.current)
    viewPrefsTimer.current = window.setTimeout(() => {
      void apiPatchViewPreferences(next).catch(() => undefined)
    }, 400)
  }

  // Comment suggestions, scoped to the Timer's current code when it has one — the running Entry's
  // when a Timer runs, the composed draft's otherwise (BIZ-085).
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
      .filter((e) => (timerCodeId ? e.codeId === timerCodeId : true))
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
  }, [entries, draft.description, timerCodeId, codesById])

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
        isToday: iso === today,
      }
    })
    return { days: columns, dayIsoByDayOfMonth: isoByDay }
  }, [periodScheme, anchor, workdays, absences, today])

  const rows: PeriodRow[] = useMemo(
    () =>
      Object.keys(matrix).flatMap((key) => {
        const [codeId, activity] = key.split('|') as [string, ActivityName]
        const code = codesById[codeId]
        if (!code) return []
        return [
          { key, code, activity, minutesByDay: matrix[key], manualByDay: manualMatrix[key] ?? {} },
        ]
      }),
    [matrix, manualMatrix, codesById],
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
    return [
      ...rows,
      { key, code, activity, minutesByDay: { [day]: runningMinutes }, manualByDay: {} },
    ]
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
    const title = `${code?.name ?? code?.number ?? ''} · ${activity} · ${dayLabel(date, today)}`
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

  // BIZ-066: per-day-column Add in the Review grid — a code-agnostic new entry prefilled with that
  // column's date (day-of-month resolved within the viewed period).
  const openAddEntryOnDay = (day: number) => addEntry(cellDayIso(day))

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
  const addAbsence = (date: string, reason: string, end?: string | null) => {
    apiAddAbsence(date, reason, end)
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
      // The running entry (BIZ-038) is shown too — pinned to the top of its day, live and read-only.
      const list = byDate.get(entry.date) ?? []
      list.push(entry)
      byDate.set(entry.date, list)
    }
    // The running entry's live duration (0 if none/uncounted) folds into the day total.
    const durationOf = (e: Entry): number =>
      e.id === runningId ? runningMinutes : Math.max(0, (e.end ?? e.start) - e.start)
    return [...byDate.keys()]
      .sort()
      .reverse()
      .map((date) => {
        // BIZ-060: newest first within the day (oldest last), matching the days' most-recent-first
        // order — the running entry is still pinned to the very top below.
        const dayEntries = byDate
          .get(date)!
          .slice()
          .sort((a, b) => b.start - a.start)
        // Pin the running entry to the top of its day (it's the current activity).
        const runningIdx = dayEntries.findIndex((e) => e.id === runningId)
        if (runningIdx > 0) {
          const [live] = dayEntries.splice(runningIdx, 1)
          dayEntries.unshift(live)
        }
        const total = dayEntries.reduce((s, e) => s + durationOf(e), 0)
        return {
          date,
          label: dayLabel(date, today),
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
      activity={timerActivity}
      suggestions={suggestions}
      onDescriptionChange={(v) => {
        // From here on the bar's text wins over the stored one, until the segment closes (BIZ-085).
        descriptionTouched.current = true
        setDraft((d) => ({ ...d, description: v }))
      }}
      onStart={startTimer}
      onStop={stopTimer}
      onCancel={cancelTimer}
      onSwitchTask={() => setPicker({ target: 'timer', at: momentNow() })}
      onSubmitDescription={() => startTimer()}
      taskId={running?.taskId ?? null}
      onComplete={completeTimer}
      onInsertBreak={running ? () => setBreakTarget(running) : undefined}
      switchTargets={switchTargets}
      onPickSwitchTarget={switchToTarget}
      startMinute={running?.start ?? null}
      onEditStart={(minute) => {
        if (running) {
          apiPatchEntry(running.id, { start: minute })
            .then(reload)
            .catch((err: unknown) => notifyError(errorMessage(err, 'Could not save the entry.')))
        }
      }}
      onPickSuggestion={(s) => {
        resetDraft({ codeId: s.codeId, activity: s.activity, description: s.description })
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
      tasksDueCount={tasksDueCount}
      user={user}
    >
      {route === 'tracker' && (
        <TrackerScreen
          groups={trackerGroups}
          codesById={codesById}
          loading={entriesLoading}
          runningId={runningId}
          runningMinutes={runningMinutes}
          onEditEntry={(id, patch) =>
            apiPatchEntry(id, patch)
              .then(reload)
              .catch((err: unknown) => notifyError(errorMessage(err, 'Could not save the entry.')))
          }
          onCategorizeEntry={(id) =>
            setPicker({ target: id, at: momentOf(entries.find((e) => e.id === id)) })
          }
          onOpenEntry={(id) => {
            const found = entries.find((e) => e.id === id)
            if (found) setEditorEntry(found)
          }}
          onResumeEntry={resumeEntry}
          onDeleteEntry={(id) => {
            const found = entries.find((e) => e.id === id)
            if (found) deleteEntryWithUndo(found)
          }}
          onInsertBreak={(id) => {
            const found = entries.find((e) => e.id === id)
            if (found) setBreakTarget(found)
          }}
          onMergeEntries={mergeEntries}
          onLoadEarlier={() => setTrackerFrom((f) => addDays(f, -14))}
          onAddEntry={addEntry}
          today={today}
        />
      )}
      {route === 'period' && (
        <PeriodScreen
          mode={viewPreferences.period_mode}
          onModeChange={(mode) => updateViewPreferences({ period_mode: mode })}
          rounding={viewPreferences.enter_rounding}
          onRoundingChange={(enter_rounding) => updateViewPreferences({ enter_rounding })}
          periodLabel={periodLabel}
          days={days}
          reviewRows={gridRows}
          enterRows={checklistRows}
          uncategorizedByDay={uncategorizedByDay}
          runningCell={runningCell ? { key: runningCell.key, day: runningCell.day } : null}
          enterRunningCell={enterRunningCell}
          checked={checked}
          onPrev={() => setAnchor((a) => shiftPeriod(periodScheme, a, -1))}
          onNext={() => setAnchor((a) => shiftPeriod(periodScheme, a, 1))}
          onThis={() => setAnchor(today)}
          onOpenCell={openCell}
          onAddCell={openAddInCell}
          onAddDay={openAddEntryOnDay}
          onChecklistChange={applyChecklistChange}
          onChecklistReset={resetChecklistMarks}
        />
      )}
      {route === 'tasks' && (
        <TasksScreen
          tasks={tasks}
          codesById={codesById}
          taskStates={taskStates}
          stateEdits={stateEdits}
          loading={tasksLoading}
          onNew={() => setTaskPanel({ task: null })}
          onNewInCode={(codeId) => setTaskPanel({ task: null, initialCodeId: codeId })}
          onOpenTask={(task) => setTaskPanel({ task })}
          onStartTask={startTaskTimer}
          onMoveTask={moveTask}
          preferences={viewPreferences}
          onPreferencesChange={updateViewPreferences}
        />
      )}
      {route === 'codes' && (
        <CodeCatalogScreen
          codes={visibleCodes}
          loading={codesLoading}
          onNew={() => setEditor({ code: null })}
          onNewVirtual={() => setVirtualEditor({ code: null })}
          onEdit={(code) => setEditor({ code })}
          onEditVirtual={(code) => setVirtualEditor({ code })}
          onDelete={deleteCode}
          deleteBlockedBy={deleteBlockedBy}
          onShowTotals={setTotalsCode}
          onRetire={setRetiringCode}
          onRestore={restoreCode}
          showObsolete={viewPreferences.show_obsolete}
          onShowObsoleteChange={(show_obsolete) => updateViewPreferences({ show_obsolete })}
          onImport={importCatalogFile}
          importStatus={importMessage}
          onSearchReference={searchReference}
          onActivateReference={(ref) => activateReference(ref)}
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
          likelyCount={viewPreferences.likely_count}
          onLikelyCountChange={(likely_count) => updateViewPreferences({ likely_count })}
          switchCount={viewPreferences.switch_count}
          onSwitchCountChange={(switch_count) => updateViewPreferences({ switch_count })}
        />
      )}

      {addDraft && (
        <EntryEditor
          entry={addDraft}
          code={addDraft.codeId ? (codesById[addDraft.codeId] ?? null) : null}
          title="New entry"
          onSave={saveAddDraft}
          onOpenPicker={({ date, startMinute }) =>
            setPicker({
              target: 'new',
              at: startMinute === null ? null : formatLocalMoment(date, startMinute),
            })
          }
          onClose={() => setAddDraft(null)}
        />
      )}

      {virtualEditor && (
        <VirtualCodeEditor
          code={virtualEditor.code}
          // Full set (incl. hidden backing-only codes, BIZ-075): the backing selector must resolve an
          // already-chosen backing for display and let a second virtual reuse an existing backing.
          realCodes={codes.filter((c) => !c.isVirtual)}
          codes={codes}
          onSave={saveVirtualCode}
          onDelete={
            virtualEditor.code && deleteBlockedBy(virtualEditor.code.id) !== 'virtual'
              ? () => deleteCode(virtualEditor.code!)
              : undefined
          }
          deleteBlockedReason={VIRTUAL_CHILDREN_BLOCK}
          onClose={() => setVirtualEditor(null)}
          onSearchReference={searchReference}
          onActivateReference={addBackingFromReference}
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
          onOpenPicker={({ date, startMinute }) => {
            setPicker({
              target: editorEntry.id,
              at: startMinute === null ? null : formatLocalMoment(date, startMinute),
            })
            setEditorEntry(null)
          }}
          onDelete={() => deleteEntryWithUndo(editorEntry, refreshCell)}
          onInsertBreak={() => setBreakTarget(editorEntry)}
          onClose={() => setEditorEntry(null)}
        />
      )}

      {staleTimerPrompt && (
        <StaleTimerModal
          entry={staleTimerPrompt}
          dayLabel={dayLabel(staleTimerPrompt.date, today)}
          elapsedMinutes={runningMinutes}
          onSetEnd={(minute) =>
            apiPatchEntry(staleTimerPrompt.id, { end: minute })
              .then(reload)
              .catch((err: unknown) =>
                notifyError(errorMessage(err, 'Could not set the end time.')),
              )
          }
          onDiscard={() => deleteEntryWithUndo(staleTimerPrompt)}
          onClose={() => setStaleDismissed(staleTimerPrompt.id)}
        />
      )}

      {breakTarget && (
        <BreakModal
          entry={breakTarget}
          nowMinute={new Date(now).getHours() * 60 + new Date(now).getMinutes()}
          codes={codes}
          onApply={(draft) => applyBreak(breakTarget.id, draft)}
          onClose={() => setBreakTarget(null)}
          onSearchReference={searchReference}
          onActivateReference={(ref) => activateReference(ref)}
        />
      )}

      {taskPanel && (
        <TaskPanel
          task={taskPanel.task}
          initialCodeId={taskPanel.initialCodeId ?? null}
          codes={pickableCodes}
          taskStates={taskStates}
          tagSuggestions={taskTags}
          onSave={saveTask}
          onDelete={taskPanel.task ? () => deleteTask(taskPanel.task!) : undefined}
          onClose={() => setTaskPanel(null)}
          onSearchReference={searchReference}
          onActivateReference={activateReference}
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
          onCategorizeEntry={(id) =>
            setPicker({ target: id, at: momentOf(cellEntries.find((e) => e.id === id)) })
          }
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

      {/* Rendered after CellEntriesModal (and the other openers above) so the picker stacks above the
          modal it was opened from: modals share one z-index, so DOM order alone decides stacking, and
          the picker is opened from within the cell drill-down (TEC-009). */}
      {retiringCode && (
        <RetireCodeModal
          code={retiringCode}
          codes={pickableCodes}
          periodStart={isoDate(periodBounds(periodScheme, today).start)}
          periodEnd={isoDate(periodBounds(periodScheme, today).end)}
          onRetire={(sweep) => retireCode(retiringCode, sweep)}
          onClose={() => setRetiringCode(null)}
        />
      )}
      {pendingImport && (
        <ImportCatalogModal
          fileName={pendingImport.name}
          onImport={(completeCatalog) => runCatalogImport(pendingImport, completeCatalog)}
          onClose={() => setPendingImport(null)}
        />
      )}
      {orphanedCodes.length > 0 && repointTarget === null && (
        <OrphanedCodesModal
          orphaned={orphanedCodes}
          onRetire={retireOrphanedCode}
          onRepoint={setRepointTarget}
          onClose={() => setOrphanedCodes([])}
        />
      )}
      {/* Rendered after the orphan list so it stacks above it: picking the replacement is a step
          inside that flow, not a separate screen (TEC-009's DOM-order stacking rule). */}
      {repointTarget && (
        <CodePicker
          title={`Charge ${repointTarget.name} to…`}
          codes={pickableCodes.filter((c) => !c.isVirtual && c.id !== repointTarget.id)}
          codeOnly
          realOnly
          onClose={() => setRepointTarget(null)}
          onPick={(codeId) => void repointOrphanedCode(repointTarget, codeId)}
        />
      )}
      {totalsCode && (
        <CodeTotalsModal
          code={totalsCode}
          periodStart={isoDate(periodBounds(periodScheme, anchor).start)}
          periodEnd={isoDate(periodBounds(periodScheme, anchor).end)}
          today={today}
          onFetch={(range) => fetchCodeTotals(totalsCode.id, range)}
          onClose={() => setTotalsCode(null)}
        />
      )}
      {blocking && (
        <BlockingEntriesModal
          code={blocking.code}
          codes={pickableCodes}
          blocking={blocking.blocking}
          onClose={() => setBlocking(null)}
          onReassign={(targetCodeId, activity) =>
            apiReassignBlockingEntries(blocking.code.id, targetCodeId, activity)
              .then((refreshed) => afterBlockingResolved(blocking.code, refreshed))
              .catch((err: unknown) =>
                notifyError(errorMessage(err, 'Could not reassign those entries.')),
              )
          }
          onDeleteEntries={() =>
            apiDeleteBlockingEntries(blocking.code.id)
              .then((refreshed) => afterBlockingResolved(blocking.code, refreshed))
              .catch((err: unknown) =>
                notifyError(errorMessage(err, 'Could not delete those entries.')),
              )
          }
        />
      )}
      {picker && (
        <CodePicker
          title={
            picker.target === 'timer'
              ? 'Change code'
              : picker.target === 'new'
                ? 'Pick code & activity'
                : 'Categorize entry'
          }
          codes={pickableCodes}
          at={picker.at}
          onFetchLikely={fetchLikelyCodes}
          likelyCount={viewPreferences.likely_count}
          onCreateNew={(q) => setEditor({ code: null, initialName: q })}
          onCreateNewVirtual={() => {
            const reopenPicker = picker.target
            const reopenAt = picker.at
            setPicker(null)
            setVirtualEditor({ code: null, reopenPicker, reopenAt })
          }}
          onSearchReference={searchReference}
          onActivateReference={(ref) => activateReference(ref)}
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
                // Written to the Entry too (below), so the buffer is mirroring, not user-typed.
                descriptionTouched.current = false
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
          onClose={() => setPicker(null)}
        />
      )}

      {/* Rendered last so it stacks above any modal that opened it — including the code picker inside
          TaskPanel / VirtualCodeEditor when activating a reference code (BIZ-049). */}
      {editor && (
        <CodeEditor
          code={editor.code}
          initialName={editor.initialName}
          prefill={editor.prefill}
          codes={codes}
          onSave={saveCode}
          onDelete={
            editor.code && deleteBlockedBy(editor.code.id) !== 'virtual'
              ? () => deleteCode(editor.code!)
              : undefined
          }
          deleteBlockedReason={VIRTUAL_CHILDREN_BLOCK}
          onClose={() => setEditor(null)}
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
