import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
