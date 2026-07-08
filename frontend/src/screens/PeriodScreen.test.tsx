import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PeriodScreen } from './PeriodScreen'
import type { ChecklistState, DayColumn, PeriodRow, TimesheetCode } from '../types'

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

const reviewRows: PeriodRow[] = [
  { key: '1|Bug fixing', code, activity: 'Bug fixing', minutesByDay: { 1: 60 } },
  { key: '2|Bug fixing', code: virtualCode, activity: 'Bug fixing', minutesByDay: { 2: 30 } },
]

// Enter-in-Timesheet-system rows: the virtual code above resolves to the real code, so this is what
// resolveChecklistRows would produce — a single merged real-code row with both days' minutes.
const enterRows: PeriodRow[] = [
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

// PeriodGrid (BIZ-034) now renders both the table and the phone day-card list from the same data,
// so text/title queries that used to be unique can match twice. Scope to the table for assertions
// that aren't specifically about the grid-vs-cards markup itself.
function table() {
  return document.querySelector('.wk-grid') as HTMLTableElement
}

function renderScreen(overrides: Partial<Parameters<typeof PeriodScreen>[0]> = {}) {
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
  render(<PeriodScreen {...props} />)
  return props
}

describe('PeriodScreen — mode toggle', () => {
  it('opens in Review mode by default', () => {
    renderScreen()

    expect(screen.getByRole('button', { name: 'Review' })).toHaveClass('is-active')
    expect(screen.getByRole('button', { name: 'Enter in Timesheet system' })).not.toHaveClass(
      'is-active',
    )
    expect(screen.getByText('+ Add entry')).toBeInTheDocument()
    expect(screen.queryByText('lines entered')).not.toBeInTheDocument()
  })

  it('explains what Review vs Enter show (BIZ-047)', () => {
    renderScreen()

    // Review subheading makes clear it's by tracked code, virtual codes as their own rows.
    expect(screen.getByText(/virtual codes shown as their own rows/i)).toBeInTheDocument()
    // The toggle buttons carry explanatory tooltips (Enter resolves to the real code).
    expect(
      screen.getByRole('button', { name: 'Enter in Timesheet system' }).getAttribute('title'),
    ).toMatch(/resolved to the real code/i)
  })

  it('switches to Enter in Timesheet system and shows its mode-specific controls', () => {
    renderScreen()

    fireEvent.click(screen.getByRole('button', { name: 'Enter in Timesheet system' }))

    expect(screen.getByRole('button', { name: 'Enter in Timesheet system' })).toHaveClass(
      'is-active',
    )
    expect(screen.queryByText('+ Add entry')).not.toBeInTheDocument()
    expect(screen.getByText('lines entered')).toBeInTheDocument()
    expect(screen.getByText('Reset')).toBeInTheDocument()
  })

  it('switching mode keeps the period label in place (no reload)', () => {
    renderScreen()

    fireEvent.click(screen.getByRole('button', { name: 'Enter in Timesheet system' }))

    expect(screen.getByText('1 – 15 July 2026')).toBeInTheDocument()
  })

  it('switches back to Review from Enter in Timesheet system', () => {
    renderScreen()

    fireEvent.click(screen.getByRole('button', { name: 'Enter in Timesheet system' }))
    fireEvent.click(screen.getByRole('button', { name: 'Review' }))

    expect(screen.getByText('+ Add entry')).toBeInTheDocument()
    expect(screen.queryByText('lines entered')).not.toBeInTheDocument()
  })
})

describe('PeriodScreen — Review mode', () => {
  it('drills into a filled cell via onOpenCell', () => {
    const onOpenCell = vi.fn()
    renderScreen({ onOpenCell })

    clickCell('1:00')

    expect(onOpenCell).toHaveBeenCalledWith('1|Bug fixing', 1)
  })

  it('adds via an empty working cell using onAddCell', () => {
    const onAddCell = vi.fn()
    renderScreen({ onAddCell })

    // Row "2|Bug fixing" has no minutes on day 1 → empty, addable working cell. The "+" affordance
    // only exists in the table (the day-card list has no add-empty-cell equivalent).
    const addCells = within(table()).getAllByText('+')
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

    expect(within(table()).getByText('Paper V4')).toBeInTheDocument()
    expect(within(table()).getByText('Workday contact info')).toBeInTheDocument()
  })
})

describe('PeriodScreen — Enter in Timesheet system mode', () => {
  function enterMode(overrides: Partial<Parameters<typeof PeriodScreen>[0]> = {}) {
    const props = renderScreen(overrides)
    fireEvent.click(screen.getByRole('button', { name: 'Enter in Timesheet system' }))
    return props
  }

  it('resolves virtual codes into the real code (merged row)', () => {
    enterMode()

    expect(within(table()).getByText('Paper V4')).toBeInTheDocument()
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

    expect(onChecklistChange).toHaveBeenCalledWith({
      '1|Bug fixing#1': true,
      '1|Bug fixing#2': true,
    })
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

describe('PeriodScreen — Total column', () => {
  it('shows the Total column header in Review mode', () => {
    renderScreen()

    expect(within(table()).getByText('Total')).toBeInTheDocument()
  })

  it('shows the Total column header in Enter in Timesheet system mode', () => {
    renderScreen()

    fireEvent.click(screen.getByRole('button', { name: 'Enter in Timesheet system' }))

    expect(within(table()).getByText('Total')).toBeInTheDocument()
  })
})

describe('PeriodScreen — running timer cell', () => {
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

  it('is not tickable in Enter in Timesheet system mode', () => {
    const onChecklistChange = vi.fn()
    renderScreen({
      runningCell: { key: '1|Bug fixing', day: 1 },
      onChecklistChange,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enter in Timesheet system' }))

    // Day 1 for the merged real-code row is the running cell; clicking it must not toggle. Scoped
    // to the table — the day-card list (BIZ-034) renders the same running-cell title on its line.
    const cell = within(table()).getByTitle('Timer running — stop it to edit')
    fireEvent.click(cell)

    expect(onChecklistChange).not.toHaveBeenCalled()
  })

  it('is not tickable in Enter in Timesheet system mode when the timer runs on a virtual code (ADR-0008)', () => {
    // Review's runningCell is keyed by the virtual code; enterRunningCell resolves it to the real
    // code so it still matches the merged Enter-in-Timesheet-system row (App.tsx wires this resolution).
    const onChecklistChange = vi.fn()
    renderScreen({
      runningCell: { key: '2|Bug fixing', day: 1 },
      enterRunningCell: { key: '1|Bug fixing', day: 1 },
      onChecklistChange,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enter in Timesheet system' }))

    const cell = within(table()).getByTitle('Timer running — stop it to edit')
    fireEvent.click(cell)

    expect(onChecklistChange).not.toHaveBeenCalled()
  })
})
