import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { Entry, TimesheetCode } from './types'
import * as api from './lib/api'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

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

function mockBaseApi(codes: TimesheetCode[], entries: Entry[]) {
  vi.spyOn(api, 'fetchCodes').mockResolvedValue(codes)
  vi.spyOn(api, 'fetchEntriesRange').mockResolvedValue(entries)
  vi.spyOn(api, 'fetchSettings').mockResolvedValue({
    workdays: [false, true, true, true, true, true, false],
    density: 'comfortable',
    absences: [],
  })
  vi.spyOn(api, 'fetchFortnight').mockResolvedValue({})
  vi.spyOn(api, 'fetchChecklist').mockResolvedValue({})
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
      absences: [],
    })
    vi.spyOn(api, 'fetchFortnight').mockResolvedValue({})
    vi.spyOn(api, 'fetchChecklist').mockResolvedValue({})

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
      absences: [],
    })
    vi.spyOn(api, 'fetchFortnight').mockResolvedValue({})
    vi.spyOn(api, 'fetchChecklist').mockResolvedValue({})

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
