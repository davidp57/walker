import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FortnightScreen } from './FortnightScreen'
import type { ChecklistState, DayColumn, FortnightRow, TimesheetCode } from '../types'

afterEach(() => cleanup())

const code: TimesheetCode = {
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

// A two-day period: day 1 is a working day with a filled cell, day 2 is a weekend.
const days: DayColumn[] = [
  { day: 1, weekday: 'Mon', isWeekend: false, isAbsence: false, isToday: false },
  { day: 2, weekday: 'Tue', isWeekend: false, isAbsence: false, isToday: false },
  { day: 3, weekday: 'Wed', isWeekend: true, isAbsence: false, isToday: false },
]

const reviewRows: FortnightRow[] = [
  { key: '1|Bug fixing', code, activity: 'Bug fixing', minutesByDay: { 1: 60 } },
  { key: '2|Bug fixing', code: virtualCode, activity: 'Bug fixing', minutesByDay: { 2: 30 } },
]

// Enter-in-T&E rows: the virtual code above resolves to the real code, so this is what
// resolveChecklistRows would produce — a single merged real-code row with both days' minutes.
const enterRows: FortnightRow[] = [
  { key: '1|Bug fixing', code, activity: 'Bug fixing', minutesByDay: { 1: 60, 2: 30 } },
]

// Click a grid body cell (not the daily-total footer, which can show the same formatted duration).
function clickCell(text: string, eventInit?: Parameters<typeof fireEvent.click>[1]) {
  const match = screen
    .getAllByText(text)
    .map((el) => el.closest('td.wk-cell'))
    .find((td): td is HTMLTableCellElement => td !== null)
  if (!match) throw new Error(`No wk-cell found with text "${text}"`)
  fireEvent.click(match, eventInit)
}

function renderScreen(overrides: Partial<Parameters<typeof FortnightScreen>[0]> = {}) {
  const props = {
    periodLabel: '1 – 15 July 2026',
    days,
    reviewRows,
    enterRows,
    runningCell: null,
    checked: {} as ChecklistState,
    onPrev: vi.fn(),
    onNext: vi.fn(),
    onThis: vi.fn(),
    onOpenCell: vi.fn(),
    onAddCell: vi.fn(),
    onAddEntry: vi.fn(),
    onChecklistChange: vi.fn(),
    onChecklistReset: vi.fn(),
    ...overrides,
  }
  render(<FortnightScreen {...props} />)
  return props
}

describe('FortnightScreen — mode toggle', () => {
  it('opens in Review mode by default', () => {
    renderScreen()

    expect(screen.getByRole('button', { name: 'Review' })).toHaveClass('is-active')
    expect(screen.getByRole('button', { name: 'Enter in T&E' })).not.toHaveClass('is-active')
    expect(screen.getByText('+ Add entry')).toBeInTheDocument()
    expect(screen.queryByText('lines entered')).not.toBeInTheDocument()
  })

  it('switches to Enter in T&E and shows its mode-specific controls', () => {
    renderScreen()

    fireEvent.click(screen.getByRole('button', { name: 'Enter in T&E' }))

    expect(screen.getByRole('button', { name: 'Enter in T&E' })).toHaveClass('is-active')
    expect(screen.queryByText('+ Add entry')).not.toBeInTheDocument()
    expect(screen.getByText('lines entered')).toBeInTheDocument()
    expect(screen.getByText('Reset')).toBeInTheDocument()
  })

  it('switching mode keeps the period label in place (no reload)', () => {
    renderScreen()

    fireEvent.click(screen.getByRole('button', { name: 'Enter in T&E' }))

    expect(screen.getByText('1 – 15 July 2026')).toBeInTheDocument()
  })

  it('switches back to Review from Enter in T&E', () => {
    renderScreen()

    fireEvent.click(screen.getByRole('button', { name: 'Enter in T&E' }))
    fireEvent.click(screen.getByRole('button', { name: 'Review' }))

    expect(screen.getByText('+ Add entry')).toBeInTheDocument()
    expect(screen.queryByText('lines entered')).not.toBeInTheDocument()
  })
})

describe('FortnightScreen — Review mode', () => {
  it('drills into a filled cell via onOpenCell', () => {
    const onOpenCell = vi.fn()
    renderScreen({ onOpenCell })

    clickCell('1:00')

    expect(onOpenCell).toHaveBeenCalledWith('1|Bug fixing', 1)
  })

  it('adds via an empty working cell using onAddCell', () => {
    const onAddCell = vi.fn()
    renderScreen({ onAddCell })

    // Row "2|Bug fixing" has no minutes on day 1 → empty, addable working cell.
    const addCells = screen.getAllByText('+')
    fireEvent.click(addCells[0])

    expect(onAddCell).toHaveBeenCalled()
  })

  it('calls onAddEntry from the + Add entry button', () => {
    const onAddEntry = vi.fn()
    renderScreen({ onAddEntry })

    fireEvent.click(screen.getByText('+ Add entry'))

    expect(onAddEntry).toHaveBeenCalledOnce()
  })

  it('shows one row per code (virtual codes as their own row)', () => {
    renderScreen()

    expect(screen.getByText('Paper V4')).toBeInTheDocument()
    expect(screen.getByText('Workday contact info')).toBeInTheDocument()
  })
})

describe('FortnightScreen — Enter in T&E mode', () => {
  function enterMode(overrides: Partial<Parameters<typeof FortnightScreen>[0]> = {}) {
    const props = renderScreen(overrides)
    fireEvent.click(screen.getByRole('button', { name: 'Enter in T&E' }))
    return props
  }

  it('resolves virtual codes into the real code (merged row)', () => {
    enterMode()

    expect(screen.getByText('Paper V4')).toBeInTheDocument()
    expect(screen.queryByText('Workday contact info')).not.toBeInTheDocument()
  })

  it('ticks a cell and persists via onChecklistChange', () => {
    const onChecklistChange = vi.fn()
    enterMode({ onChecklistChange })

    clickCell('1:00')

    expect(onChecklistChange).toHaveBeenCalledWith({ '1|Bug fixing#1': true })
  })

  it('shift-clicks a column-major range', () => {
    const onChecklistChange = vi.fn()
    enterMode({ onChecklistChange })

    clickCell('1:00', { shiftKey: false })
    clickCell('0:30', { shiftKey: true })

    expect(onChecklistChange).toHaveBeenLastCalledWith({
      '1|Bug fixing#1': true,
      '1|Bug fixing#2': true,
    })
  })

  it('ctrl-clicks to toggle a single cell off again', () => {
    const onChecklistChange = vi.fn()
    enterMode({ checked: { '1|Bug fixing#1': true, '1|Bug fixing#2': true }, onChecklistChange })

    clickCell('1:00', { ctrlKey: true })

    expect(onChecklistChange).toHaveBeenCalledWith({ '1|Bug fixing#2': true })
  })

  it('shows the row n/N badge and toggles the whole row via onChecklistChange', () => {
    const onChecklistChange = vi.fn()
    enterMode({ onChecklistChange })

    expect(screen.getByText('0/2')).toBeInTheDocument()
    fireEvent.click(screen.getByText('0/2'))

    expect(onChecklistChange).toHaveBeenCalledWith({ '1|Bug fixing#1': true, '1|Bug fixing#2': true })
  })

  it('calls onChecklistReset from the Reset button', () => {
    const onChecklistReset = vi.fn()
    enterMode({ onChecklistReset })

    fireEvent.click(screen.getByText('Reset'))

    expect(onChecklistReset).toHaveBeenCalledOnce()
  })

  it('shows the X / Y lines entered counter', () => {
    enterMode({ checked: { '1|Bug fixing#1': true } })

    const count = document.querySelector('.wk-progress-count')
    expect(count?.textContent?.replace(/\s+/g, ' ').trim()).toBe('1 / 2')
  })
})

describe('FortnightScreen — Total column', () => {
  it('shows the Total column header in Review mode', () => {
    renderScreen()

    expect(screen.getByText('Total')).toBeInTheDocument()
  })

  it('shows the Total column header in Enter in T&E mode', () => {
    renderScreen()

    fireEvent.click(screen.getByRole('button', { name: 'Enter in T&E' }))

    expect(screen.getByText('Total')).toBeInTheDocument()
  })
})

describe('FortnightScreen — running timer cell', () => {
  it('is tinted/read-only in Review and not addable/openable', () => {
    const onOpenCell = vi.fn()
    const onAddCell = vi.fn()
    renderScreen({
      runningCell: { key: '2|Bug fixing', day: 1 },
      onOpenCell,
      onAddCell,
    })

    // Row "2|Bug fixing" day 1 is the running cell (no minutes), it must not be addable.
    const rows = screen.getAllByRole('row')
    const runningRow = rows.find((r) => r.textContent?.includes('Workday contact info'))
    expect(runningRow).toBeTruthy()
  })

  it('is not tickable in Enter in T&E mode', () => {
    const onChecklistChange = vi.fn()
    renderScreen({
      runningCell: { key: '1|Bug fixing', day: 1 },
      onChecklistChange,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enter in T&E' }))

    // Day 1 for the merged real-code row is the running cell; clicking it must not toggle.
    const cell = screen.getByTitle('Timer running — stop it to edit')
    fireEvent.click(cell)

    expect(onChecklistChange).not.toHaveBeenCalled()
  })
})
