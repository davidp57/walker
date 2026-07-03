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

const runningStub: Entry = {
  id: '20',
  date: new Date().toISOString().slice(0, 10),
  start: 540,
  end: null,
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

describe('App — keyboard-driven timer loop (BIZ-009)', () => {
  it('pressing Enter in the description field starts a Timer carrying that description', async () => {
    mockBaseApi([realCode], [])
    const startTimer = vi.spyOn(api, 'startTimer').mockResolvedValue(runningStub)
    const patchEntry = vi.spyOn(api, 'patchEntry').mockResolvedValue({
      ...runningStub,
      description: 'writing spec',
    })
    vi.spyOn(api, 'fetchEntriesRange').mockResolvedValue([]) // initial load: nothing running yet

    render(<App />)

    const input = await screen.findByPlaceholderText('What are you working on?')
    fireEvent.change(input, { target: { value: 'writing spec' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(startTimer).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(patchEntry).toHaveBeenCalledWith(
        runningStub.id,
        expect.objectContaining({ description: 'writing spec' }),
      ),
    )
  })

  it('the capture-first empty Start still works (Start button, no description)', async () => {
    mockBaseApi([realCode], [])
    const startTimer = vi.spyOn(api, 'startTimer').mockResolvedValue(runningStub)
    const patchEntry = vi.spyOn(api, 'patchEntry')

    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: 'Start' }))

    await waitFor(() => expect(startTimer).toHaveBeenCalledTimes(1))
    expect(patchEntry).not.toHaveBeenCalled()
  })

  it('a global shortcut toggles start/stop of the Timer', async () => {
    mockBaseApi([realCode], [])
    const startTimer = vi.spyOn(api, 'startTimer').mockResolvedValue(runningStub)

    render(<App />)
    await screen.findByPlaceholderText('What are you working on?')

    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true })

    await waitFor(() => expect(startTimer).toHaveBeenCalledTimes(1))
  })

  it('the start/stop shortcut does not fire while typing in an unrelated input', async () => {
    mockBaseApi([realCode], [])
    const startTimer = vi.spyOn(api, 'startTimer').mockResolvedValue(runningStub)
    vi.spyOn(api, 'createEntry').mockResolvedValue({
      id: '30',
      date: new Date().toISOString().slice(0, 10),
      start: 540,
      end: 600,
      codeId: null,
      activity: null,
      description: '',
    })

    render(<App />)
    fireEvent.click(await screen.findByText('+ Add entry'))
    const commentInput = await screen.findByPlaceholderText('Add a description…')

    fireEvent.keyDown(commentInput, { key: 'Enter', ctrlKey: true })

    expect(startTimer).not.toHaveBeenCalled()
  })

  it('a global shortcut opens the task switcher', async () => {
    mockBaseApi([realCode], [])

    render(<App />)
    await screen.findByPlaceholderText('What are you working on?')

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })

    expect(await screen.findByText('Switch task')).toBeInTheDocument()
  })
})
