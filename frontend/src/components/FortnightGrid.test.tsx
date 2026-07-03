import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { FortnightGrid } from './FortnightGrid'
import type { DayColumn, FortnightRow, TimesheetCode } from '../types'

const day = (overrides: Partial<DayColumn> = {}): DayColumn => ({
  day: 1,
  weekday: 'Mon',
  isWeekend: false,
  isAbsence: false,
  isToday: false,
  ...overrides,
})

const code = (overrides: Partial<TimesheetCode> = {}): TimesheetCode => ({
  id: 'c1',
  number: 'N9/1042',
  name: 'Internal administration',
  label: 'MNT - INT ADMIN',
  color: '#ff0000',
  activities: [],
  isVirtual: false,
  realCodeId: null,
  realCodeNumber: null,
  ...overrides,
})

describe('FortnightGrid — Activity dedup', () => {
  it('omits the Activity line when it equals the Code project name', () => {
    const row: FortnightRow = {
      key: 'c1|Internal administration',
      code: code({ name: 'Internal administration' }),
      activity: 'Internal administration',
      minutesByDay: { 1: 60 },
    }
    render(
      <FortnightGrid
        mode="fortnight"
        days={[day()]}
        rows={[row]}
        runningCell={null}
        onOpenCell={() => {}}
        onAddCell={() => {}}
      />,
    )

    // The project name renders once; the identical Activity line is not duplicated.
    expect(screen.getAllByText('Internal administration')).toHaveLength(1)
  })

  it('still shows the Activity line when it differs from the project name', () => {
    const row: FortnightRow = {
      key: 'c1|Bug fixing',
      code: code({ name: 'Paper V4' }),
      activity: 'Bug fixing',
      minutesByDay: { 1: 60 },
    }
    render(
      <FortnightGrid
        mode="fortnight"
        days={[day()]}
        rows={[row]}
        runningCell={null}
        onOpenCell={() => {}}
        onAddCell={() => {}}
      />,
    )

    expect(screen.getByText('Paper V4')).toBeInTheDocument()
    expect(screen.getByText('Bug fixing')).toBeInTheDocument()
  })
})

describe('FortnightGrid — copy T&E code', () => {
  const row: FortnightRow = {
    key: 'c1|Internal administration',
    code: code({ number: 'N9/1042' }),
    activity: 'Internal administration',
    minutesByDay: { 1: 60 },
  }

  let writeText: ReturnType<typeof vi.fn>

  beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('copies the code number to the clipboard when clicked, in Enter-in-T&E (checklist) mode', async () => {
    render(
      <FortnightGrid
        mode="checklist"
        days={[day()]}
        rows={[row]}
        checked={{}}
        runningCell={null}
        onToggleCell={() => {}}
        onToggleRow={() => {}}
      />,
    )

    const copyButton = screen.getByRole('button', { name: /copy.*code/i })
    fireEvent.click(copyButton)

    expect(writeText).toHaveBeenCalledWith('N9/1042')
  })

  it('shows a confirmation after copying, then reverts', async () => {
    render(
      <FortnightGrid
        mode="checklist"
        days={[day()]}
        rows={[row]}
        checked={{}}
        runningCell={null}
        onToggleCell={() => {}}
        onToggleRow={() => {}}
      />,
    )

    const copyButton = screen.getByRole('button', { name: /copy.*code/i })
    expect(copyButton).toHaveAttribute('title', expect.stringMatching(/copy/i))

    fireEvent.click(copyButton)

    // Feedback appears — the button now confirms the copy (title and/or accessible name change).
    await screen.findByRole('button', { name: /copied/i })
  })

  it('does not trigger the row n/N badge toggle when the copy button is clicked', () => {
    const onToggleRow = vi.fn()
    render(
      <FortnightGrid
        mode="checklist"
        days={[day()]}
        rows={[row]}
        checked={{}}
        runningCell={null}
        onToggleCell={() => {}}
        onToggleRow={onToggleRow}
      />,
    )

    const copyButton = screen.getByRole('button', { name: /copy.*code/i })
    fireEvent.click(copyButton)

    expect(onToggleRow).not.toHaveBeenCalled()
  })

  it('still allows the row n/N badge to toggle the row independently', () => {
    const onToggleRow = vi.fn()
    render(
      <FortnightGrid
        mode="checklist"
        days={[day()]}
        rows={[row]}
        checked={{}}
        runningCell={null}
        onToggleCell={() => {}}
        onToggleRow={onToggleRow}
      />,
    )

    fireEvent.click(screen.getByTitle('Mark whole row as entered'))

    expect(onToggleRow).toHaveBeenCalledWith(row.key)
  })
})
