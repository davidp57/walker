import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { Entry, Theme, TimesheetCode } from './types'
import { DEFAULT_VIEW_PREFERENCES } from './types'
import * as api from './lib/api'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

/**
 * Clicks a nav destination by label, scoped to the sidebar (BIZ-033 also renders a bottom tab bar
 * with the same labels, so an unscoped query would be ambiguous).
 */
async function clickNav(label: string): Promise<void> {
  const nav = await screen.findByRole('navigation', { name: /main navigation/i })
  fireEvent.click(within(nav).getByText(label))
}

const realCode: TimesheetCode = {
  id: '1',
  number: 'N9/1042',
  label: 'MNT - PAP V4',
  name: 'Paper V4',
  color: '#5b9cf6',
  activities: [{ code: '0001', label: 'Bug fixing' }],
  isVirtual: false,
  realCodeId: null,
  realCodeNumber: null,
}

const virtualCode: TimesheetCode = {
  id: '2',
  number: 'N9/1042',
  label: 'MNT - PAP V4',
  name: 'Workday contact info',
  color: '#abcdef',
  activities: [{ code: '0001', label: 'Bug fixing' }],
  isVirtual: true,
  realCodeId: '1',
  realCodeNumber: 'N9/1042',
}

const uncategorizedEntry: Entry = {
  id: '10',
  date: new Date().toISOString().slice(0, 10),
  start: 540,
  end: 600,
  codeId: null,
  activity: null,
  description: '',
}

function mockBaseApi(codes: TimesheetCode[], entries: Entry[], theme: Theme = 'system') {
  vi.spyOn(api, 'fetchCodes').mockResolvedValue(codes)
  vi.spyOn(api, 'fetchEntriesRange').mockResolvedValue(entries)
  vi.spyOn(api, 'fetchSettings').mockResolvedValue({
    workdays: [false, true, true, true, true, true, false],
    density: 'comfortable',
    periodScheme: 'semi_monthly',
    theme,
    absences: [],
    viewPreferences: DEFAULT_VIEW_PREFERENCES,
  })
  vi.spyOn(api, 'fetchPeriod').mockResolvedValue({})
  vi.spyOn(api, 'fetchChecklist').mockResolvedValue({})
  vi.spyOn(api, 'fetchTasks').mockResolvedValue([])
  vi.spyOn(api, 'fetchTaskTags').mockResolvedValue([])
}

describe('App — tracking on a virtual code (BIZ-013)', () => {
  it('categorizing an entry with a virtual code patches it with that virtual code id', async () => {
    mockBaseApi([realCode, virtualCode], [uncategorizedEntry])
    const patchEntry = vi.spyOn(api, 'patchEntry').mockResolvedValue({
      ...uncategorizedEntry,
      codeId: virtualCode.id,
      activity: 'Bug fixing',
    })

    render(<App />)

    fireEvent.click(await screen.findByText('⚑ Add code & activity'))
    // Both the real and virtual code offer the same "Bug fixing" activity — pick the virtual one.
    const activityButtons = await screen.findAllByText('Bug fixing')
    fireEvent.click(activityButtons[1])

    await waitFor(() =>
      expect(patchEntry).toHaveBeenCalledWith(
        uncategorizedEntry.id,
        expect.objectContaining({ codeId: virtualCode.id, activity: 'Bug fixing' }),
      ),
    )
  })

  it('categorizing an entry with a real code directly is unchanged', async () => {
    mockBaseApi([realCode, virtualCode], [uncategorizedEntry])
    const patchEntry = vi.spyOn(api, 'patchEntry').mockResolvedValue({
      ...uncategorizedEntry,
      codeId: realCode.id,
      activity: 'Bug fixing',
    })

    render(<App />)

    fireEvent.click(await screen.findByText('⚑ Add code & activity'))
    const activityButtons = await screen.findAllByText('Bug fixing')
    fireEvent.click(activityButtons[0])

    await waitFor(() =>
      expect(patchEntry).toHaveBeenCalledWith(
        uncategorizedEntry.id,
        expect.objectContaining({ codeId: realCode.id, activity: 'Bug fixing' }),
      ),
    )
  })

  it('prefills the description with the last comment used for that code + activity', async () => {
    const priorEntry: Entry = {
      id: '9',
      date: '2026-06-20',
      start: 540,
      end: 600,
      codeId: virtualCode.id,
      activity: 'Bug fixing',
      description: 'Filled in Workday contact details',
    }
    mockBaseApi([realCode, virtualCode], [uncategorizedEntry, priorEntry])
    const patchEntry = vi.spyOn(api, 'patchEntry').mockResolvedValue({
      ...uncategorizedEntry,
      codeId: virtualCode.id,
      activity: 'Bug fixing',
      description: priorEntry.description,
    })

    render(<App />)

    fireEvent.click(await screen.findByText('⚑ Add code & activity'))
    const activityButtons = await screen.findAllByText('Bug fixing')
    fireEvent.click(activityButtons[1])

    await waitFor(() =>
      expect(patchEntry).toHaveBeenCalledWith(
        uncategorizedEntry.id,
        expect.objectContaining({ description: 'Filled in Workday contact details' }),
      ),
    )
  })

  it('creates a virtual code on the fly from the picker and reopens the picker to use it', async () => {
    mockBaseApi([realCode], [uncategorizedEntry])
    vi.spyOn(api, 'createVirtualCode').mockResolvedValue(virtualCode)
    const reloadedCodes = vi.spyOn(api, 'fetchCodes')

    render(<App />)

    fireEvent.click(await screen.findByText('⚑ Add code & activity'))
    fireEvent.change(await screen.findByPlaceholderText('Search code or activity…'), {
      target: { value: 'Workday contact info' },
    })
    fireEvent.click(await screen.findByText('➕ Create a new virtual code'))

    // The virtual code editor opens; reflect the newly created code once saved.
    reloadedCodes.mockResolvedValue([realCode, virtualCode])
    fireEvent.change(await screen.findByPlaceholderText('Workday contact info'), {
      target: { value: 'Workday contact info' },
    })
    fireEvent.click(screen.getByText('Save'))

    // The picker reopens automatically (design decision: "used immediately" = one more click away)
    // and now lists the freshly created virtual code.
    expect(await screen.findByText('Workday contact info')).toBeInTheDocument()
  })
})

describe('App — visible API errors and loading feedback (TEC-002)', () => {
  it('surfaces a visible error when loading entries fails, instead of silently emptying the screen', async () => {
    vi.spyOn(api, 'fetchCodes').mockResolvedValue([])
    vi.spyOn(api, 'fetchEntriesRange').mockRejectedValue(new Error('Network error'))
    vi.spyOn(api, 'fetchSettings').mockResolvedValue({
      workdays: [false, true, true, true, true, true, false],
      density: 'comfortable',
      periodScheme: 'semi_monthly',
      theme: 'system',
      absences: [],
      viewPreferences: DEFAULT_VIEW_PREFERENCES,
    })
    vi.spyOn(api, 'fetchPeriod').mockResolvedValue({})
    vi.spyOn(api, 'fetchChecklist').mockResolvedValue({})
    vi.spyOn(api, 'fetchTasks').mockResolvedValue([])
    vi.spyOn(api, 'fetchTaskTags').mockResolvedValue([])

    render(<App />)

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load/i)
  })

  it('surfaces a visible error when categorizing an entry (save) fails', async () => {
    mockBaseApi([realCode], [uncategorizedEntry])
    vi.spyOn(api, 'patchEntry').mockRejectedValue(new Error('500 Internal Server Error'))

    render(<App />)

    fireEvent.click(await screen.findByText('⚑ Add code & activity'))
    fireEvent.click(await screen.findByText('Bug fixing'))

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not save/i)
  })

  it('shows loading feedback and not the empty state until entries first arrive', async () => {
    let resolveEntries: (entries: Entry[]) => void = () => {}
    vi.spyOn(api, 'fetchCodes').mockResolvedValue([])
    vi.spyOn(api, 'fetchEntriesRange').mockReturnValue(
      new Promise((resolve) => {
        resolveEntries = resolve
      }),
    )
    vi.spyOn(api, 'fetchSettings').mockResolvedValue({
      workdays: [false, true, true, true, true, true, false],
      density: 'comfortable',
      periodScheme: 'semi_monthly',
      theme: 'system',
      absences: [],
      viewPreferences: DEFAULT_VIEW_PREFERENCES,
    })
    vi.spyOn(api, 'fetchPeriod').mockResolvedValue({})
    vi.spyOn(api, 'fetchChecklist').mockResolvedValue({})
    vi.spyOn(api, 'fetchTasks').mockResolvedValue([])
    vi.spyOn(api, 'fetchTaskTags').mockResolvedValue([])

    render(<App />)

    // While the request is in flight, the empty state must not appear.
    expect(screen.queryByText('Adios, backlog.')).not.toBeInTheDocument()

    resolveEntries([])

    // Once the (empty) response resolves, the empty state is shown.
    expect(await screen.findByText('Adios, backlog.')).toBeInTheDocument()
  })
})

describe('App — uncategorized-Entry count in the shell (BIZ-010)', () => {
  it('shows a live count of uncategorized Entries and decreases it once categorized', async () => {
    const secondUncategorized: Entry = {
      ...uncategorizedEntry,
      id: '11',
      start: 600,
      end: 660,
    }
    mockBaseApi([realCode], [uncategorizedEntry, secondUncategorized])
    const fetchEntriesRange = vi.spyOn(api, 'fetchEntriesRange')
    const patchEntry = vi.spyOn(api, 'patchEntry').mockResolvedValue({
      ...uncategorizedEntry,
      codeId: realCode.id,
      activity: 'Bug fixing',
    })

    render(<App />)

    const badge = await screen.findByTestId('wk-uncategorized-badge')
    expect(badge).toHaveTextContent('2')

    // Once categorized, the reload after the patch fetches the now-categorized Entry — the badge
    // drops from 2 to 1.
    fetchEntriesRange.mockResolvedValue([
      { ...uncategorizedEntry, codeId: realCode.id, activity: 'Bug fixing' },
      secondUncategorized,
    ])
    const flags = await screen.findAllByText('⚑ Add code & activity')
    fireEvent.click(flags[0])
    const activityButtons = await screen.findAllByText('Bug fixing')
    fireEvent.click(activityButtons[0])
    await waitFor(() => expect(patchEntry).toHaveBeenCalled())

    await waitFor(() => expect(screen.getByTestId('wk-uncategorized-badge')).toHaveTextContent('1'))
  })

  it('hides the badge when there are no uncategorized Entries', async () => {
    const categorizedEntry: Entry = {
      ...uncategorizedEntry,
      codeId: realCode.id,
      activity: 'Bug fixing',
    }
    mockBaseApi([realCode], [categorizedEntry])

    render(<App />)

    await screen.findByText('Today')
    expect(screen.queryByTestId('wk-uncategorized-badge')).not.toBeInTheDocument()
  })
})

describe('App — entry mutation safety (BIZ-011)', () => {
  const trackedEntry: Entry = {
    id: '42',
    date: '2026-06-20',
    start: 540,
    end: 600,
    codeId: realCode.id,
    activity: 'Bug fixing',
    description: 'writing spec',
  }

  it('deleting an Entry offers an undo that restores it with its fields intact', async () => {
    mockBaseApi([realCode], [trackedEntry])
    const deleteEntry = vi.spyOn(api, 'deleteEntry').mockResolvedValue(undefined)
    const createEntry = vi
      .spyOn(api, 'createEntry')
      .mockResolvedValue({ ...trackedEntry, id: '99' })

    render(<App />)

    await screen.findByText('writing spec')
    fireEvent.click(screen.getByRole('button', { name: 'Delete entry' }))

    // The Entry is removed through the existing delete endpoint straight away...
    await waitFor(() => expect(deleteEntry).toHaveBeenCalledWith('42'))

    // ...but an undo affordance is offered instead of losing it outright.
    const undoButton = await screen.findByRole('button', { name: 'Undo' })
    vi.spyOn(api, 'fetchEntriesRange').mockResolvedValue([])

    fireEvent.click(undoButton)

    // Undo restores it by recreating it (no dedicated restore endpoint) with the same fields.
    await waitFor(() =>
      expect(createEntry).toHaveBeenCalledWith({
        date: trackedEntry.date,
        start: trackedEntry.start,
        end: trackedEntry.end,
        codeId: trackedEntry.codeId,
        activity: trackedEntry.activity,
        description: trackedEntry.description,
      }),
    )
  })

  it('dismisses the undo affordance once the undo window elapses', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      mockBaseApi([realCode], [trackedEntry])
      vi.spyOn(api, 'deleteEntry').mockResolvedValue(undefined)

      render(<App />)

      await screen.findByText('writing spec')
      fireEvent.click(screen.getByRole('button', { name: 'Delete entry' }))
      await screen.findByRole('button', { name: 'Undo' })

      await act(() => vi.advanceTimersByTimeAsync(10000))

      expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('"+ Add entry" persists nothing until Save', async () => {
    mockBaseApi([realCode], [])
    const createEntry = vi.spyOn(api, 'createEntry')

    render(<App />)

    await screen.findByText('Adios, backlog.')
    fireEvent.click(screen.getByRole('button', { name: '+ Add entry' }))

    await screen.findByText('New entry')
    expect(createEntry).not.toHaveBeenCalled()
  })

  it('"+ Add entry" followed by cancel leaves no persisted Entry', async () => {
    mockBaseApi([realCode], [])
    const createEntry = vi.spyOn(api, 'createEntry')

    render(<App />)

    await screen.findByText('Adios, backlog.')
    fireEvent.click(screen.getByRole('button', { name: '+ Add entry' }))

    const dialog = (await screen.findByText('New entry')).closest('.wk-modal') as HTMLElement
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByText('New entry')).not.toBeInTheDocument())
    expect(createEntry).not.toHaveBeenCalled()
  })
})

describe('App — Timesheet period screen (BIZ-007)', () => {
  it('renders the unified Timesheet period screen in Review mode by default, with no Enter in Timesheet system nav item', async () => {
    mockBaseApi([realCode], [uncategorizedEntry])

    render(<App />)

    await clickNav('Timesheet period')

    expect(await screen.findByRole('button', { name: 'Review' })).toHaveClass('is-active')
    expect(
      screen.queryByText('Enter in Timesheet system', { selector: '.wk-nav-item span' }),
    ).not.toBeInTheDocument()
  })

  it("tints the running timer's cell as read-only in Enter in Timesheet system even when tracked on a virtual code (ADR-0008)", async () => {
    const today = new Date().toISOString().slice(0, 10)
    const runningEntry: Entry = {
      id: '11',
      date: today,
      start: 540,
      end: null,
      codeId: virtualCode.id,
      activity: 'Bug fixing',
      description: '',
    }
    mockBaseApi([realCode, virtualCode], [runningEntry])

    render(<App />)

    await clickNav('Timesheet period')
    fireEvent.click(await screen.findByRole('button', { name: 'Enter in Timesheet system' }))
    await screen.findAllByText('Paper V4')

    // The running entry is on the virtual code; resolved to the real code (ADR-0008) its cell must
    // still be tinted/read-only — "Timer running" title only appears on the resolved real-code row.
    // PeriodGrid (BIZ-034) renders both the table and the phone day-card list from the same data,
    // so this title can now appear twice — asserting at least one is enough for this check.
    expect((await screen.findAllByTitle('Timer running — stop it to edit')).length).toBeGreaterThan(
      0,
    )
  })
})

describe('App — start a Timer from a Task (BIZ-023)', () => {
  const task = {
    id: '7',
    title: 'Renew passport',
    description: '',
    status: 'todo' as const,
    priority: null,
    dueDate: null,
    tags: [],
    codeId: realCode.id,
    recurrenceRule: null,
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
  }

  it('starting a Timer from a Task sets the comment to its title and prefills its code, carrying the task id', async () => {
    mockBaseApi([realCode], [])
    vi.spyOn(api, 'fetchTasks').mockResolvedValue([task])
    const switchTimer = vi.spyOn(api, 'switchTimer').mockResolvedValue({
      id: '20',
      date: new Date().toISOString().slice(0, 10),
      start: 540,
      end: null,
      codeId: realCode.id,
      activity: 'Bug fixing',
      description: task.title,
      taskId: task.id,
    })

    render(<App />)

    await clickNav('Tasks')
    fireEvent.click(await screen.findByTestId('wk-task-start-7'))

    // The picker opens scoped to the task's code — only its activity remains to be picked.
    fireEvent.click(await screen.findByText('Bug fixing'))

    await waitFor(() =>
      expect(switchTimer).toHaveBeenCalledWith(
        expect.objectContaining({
          codeId: realCode.id,
          activity: 'Bug fixing',
          description: task.title,
          taskId: task.id,
        }),
      ),
    )
  })

  it('shows Complete alongside Stop once the running Timer is linked to a task, and completing it calls completeTimer', async () => {
    const runningTaskEntry: Entry = {
      id: '20',
      date: new Date().toISOString().slice(0, 10),
      start: 540,
      end: null,
      codeId: realCode.id,
      activity: 'Bug fixing',
      description: task.title,
      taskId: task.id,
    }
    mockBaseApi([realCode], [runningTaskEntry])
    vi.spyOn(api, 'fetchTasks').mockResolvedValue([{ ...task, status: 'in_progress' }])
    const completeTimer = vi.spyOn(api, 'completeTimer').mockResolvedValue({
      ...runningTaskEntry,
      end: 600,
    })
    vi.spyOn(api, 'patchEntry').mockResolvedValue(runningTaskEntry)

    render(<App />)

    const completeButton = await screen.findByRole('button', { name: 'Complete' })
    fireEvent.click(completeButton)

    await waitFor(() => expect(completeTimer).toHaveBeenCalledTimes(1))
  })
})

describe('App — configurable Timesheet period scheme (BIZ-027)', () => {
  it('changing the period scheme in Settings reshapes the Timesheet period view immediately', async () => {
    mockBaseApi([realCode], [])
    const fetchPeriod = vi.spyOn(api, 'fetchPeriod')
    vi.spyOn(api, 'updateSettings').mockResolvedValue({
      workdays: [false, true, true, true, true, true, false],
      density: 'comfortable',
      periodScheme: 'monthly',
      theme: 'system',
      absences: [],
      viewPreferences: DEFAULT_VIEW_PREFERENCES,
    })

    render(<App />)

    await clickNav('Settings')
    await waitFor(() => expect(fetchPeriod).toHaveBeenCalled())
    const callsBeforeChange = fetchPeriod.mock.calls.length

    fireEvent.click(await screen.findByRole('button', { name: 'Monthly' }))

    // The period view recomputes with no reload: a fresh grid fetch fires for the new scheme.
    await waitFor(() => expect(fetchPeriod.mock.calls.length).toBeGreaterThan(callsBeforeChange))

    await clickNav('Timesheet period')

    // A full calendar month's worth of columns now render (semi-monthly would cap at 15/16).
    const dayHeaders = document.querySelectorAll('.wk-day-num')
    expect(dayHeaders.length).toBeGreaterThan(16)
  })

  it('persists the chosen period scheme via updateSettings', async () => {
    mockBaseApi([realCode], [])
    vi.spyOn(api, 'fetchPeriod').mockResolvedValue({})
    const updateSettings = vi.spyOn(api, 'updateSettings').mockResolvedValue({
      workdays: [false, true, true, true, true, true, false],
      density: 'comfortable',
      periodScheme: 'weekly',
      theme: 'system',
      absences: [],
      viewPreferences: DEFAULT_VIEW_PREFERENCES,
    })

    render(<App />)

    await clickNav('Settings')
    fireEvent.click(await screen.findByRole('button', { name: 'Weekly' }))

    await waitFor(() =>
      expect(updateSettings).toHaveBeenCalledWith(
        [false, true, true, true, true, true, false],
        'comfortable',
        'weekly',
        'system',
      ),
    )
  })
})

describe('App — theme preference applied to the document (BIZ-032)', () => {
  const matchMediaMock = (matches: boolean) => {
    const listeners = new Set<() => void>()
    const mql = {
      matches,
      media: '(prefers-color-scheme: dark)',
      addEventListener: (_event: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_event: string, listener: () => void) => listeners.delete(listener),
    }
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mql as unknown as MediaQueryList))
    return {
      setMatches: (value: boolean) => {
        mql.matches = value
      },
      fire: () => listeners.forEach((l) => l()),
    }
  }

  afterEach(() => {
    vi.unstubAllGlobals()
    delete document.documentElement.dataset.theme
    window.localStorage.clear()
  })

  it('sets data-theme="dark" when the stored preference is "dark"', async () => {
    matchMediaMock(false)
    mockBaseApi([realCode], [], 'dark')

    render(<App />)

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'))
  })

  it('sets data-theme="light" when the stored preference is "light"', async () => {
    matchMediaMock(true)
    mockBaseApi([realCode], [], 'light')

    render(<App />)

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'))
  })

  it('resolves "system" to "dark" when the OS prefers dark', async () => {
    matchMediaMock(true)
    mockBaseApi([realCode], [], 'system')

    render(<App />)

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'))
  })

  it('resolves "system" to "light" when the OS prefers light', async () => {
    matchMediaMock(false)
    mockBaseApi([realCode], [], 'system')

    render(<App />)

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'))
  })

  it('updates the rendered theme live when the OS preference changes while "system" is selected', async () => {
    const media = matchMediaMock(false)
    mockBaseApi([realCode], [], 'system')

    render(<App />)

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'))

    // Flip the OS preference to dark and fire the mocked media-query change listener.
    media.setMatches(true)
    media.fire()

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'))
  })

  // Regression: the theme-applying effect runs on first render, before `fetchSettings` resolves.
  // With a hardcoded "system" starting state, an explicit "light" preference on an OS that prefers
  // dark would flash dark for one render, then correct itself once settings loaded — exactly the
  // flash BIZ-032's acceptance criteria rule out. Seeding `theme` state from the cached preference
  // (written by a previous visit) avoids that window entirely.
  it('never renders the wrong theme while settings are still loading, using the cached preference', async () => {
    matchMediaMock(true) // OS prefers dark
    window.localStorage.setItem('wk-last-theme-preference', 'light')
    vi.spyOn(api, 'fetchCodes').mockResolvedValue([realCode])
    vi.spyOn(api, 'fetchEntriesRange').mockResolvedValue([])
    vi.spyOn(api, 'fetchPeriod').mockResolvedValue({})
    vi.spyOn(api, 'fetchChecklist').mockResolvedValue({})
    vi.spyOn(api, 'fetchTasks').mockResolvedValue([])
    vi.spyOn(api, 'fetchTaskTags').mockResolvedValue([])
    // `fetchSettings` deliberately never resolves in this test — it stands in for the real network
    // delay the effect above must survive without ever painting the wrong theme in between.
    vi.spyOn(api, 'fetchSettings').mockReturnValue(new Promise(() => {}))

    render(<App />)

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'))
  })
})

describe('App — SSO sign-in gate (BIZ-029 frontend)', () => {
  it('renders the app directly when auth_mode is none (default)', async () => {
    mockBaseApi([realCode], [])
    vi.spyOn(api, 'fetchHealth').mockResolvedValue({ authMode: 'none', ssoProviders: [] })
    vi.spyOn(api, 'fetchUser').mockResolvedValue({ username: 'me', name: null })

    render(<App />)

    expect(await screen.findByPlaceholderText('What are you working on?')).toBeInTheDocument()
    expect(screen.queryByText('Sign in to continue.')).not.toBeInTheDocument()
  })

  it('renders the app when auth_mode is sso and the session is already valid', async () => {
    mockBaseApi([realCode], [])
    vi.spyOn(api, 'fetchHealth').mockResolvedValue({ authMode: 'sso', ssoProviders: ['google'] })
    vi.spyOn(api, 'fetchUser').mockResolvedValue({ username: 'alice@acme.com', name: null })

    render(<App />)

    expect(await screen.findByPlaceholderText('What are you working on?')).toBeInTheDocument()
  })

  it('shows a sign-in screen when auth_mode is sso and there is no session', async () => {
    vi.spyOn(api, 'fetchHealth').mockResolvedValue({
      authMode: 'sso',
      ssoProviders: ['google', 'microsoft'],
    })
    vi.spyOn(api, 'fetchUser').mockRejectedValue(
      new api.ApiError('401 Unauthorized for /api/user', 401),
    )
    const fetchCodes = vi.spyOn(api, 'fetchCodes')

    render(<App />)

    expect(await screen.findByText('Sign in to continue.')).toBeInTheDocument()
    const google = screen.getByRole('link', { name: 'Continue with Google' })
    expect(google).toHaveAttribute('href', '/api/auth/login/google')
    expect(screen.getByRole('link', { name: 'Continue with Microsoft' })).toHaveAttribute(
      'href',
      '/api/auth/login/microsoft',
    )
    expect(screen.queryByRole('link', { name: 'Continue with Apple' })).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('What are you working on?')).not.toBeInTheDocument()
    // The rest of the app never even mounts while a sign-in is required.
    expect(fetchCodes).not.toHaveBeenCalled()
  })

  it('falls through to the app if the health check itself fails (e.g. a network hiccup)', async () => {
    mockBaseApi([realCode], [])
    vi.spyOn(api, 'fetchHealth').mockRejectedValue(new Error('network error'))
    vi.spyOn(api, 'fetchUser').mockResolvedValue({ username: 'me', name: null })

    render(<App />)

    expect(await screen.findByPlaceholderText('What are you working on?')).toBeInTheDocument()
  })
})
