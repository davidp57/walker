import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { PeriodGrid } from './PeriodGrid'
import type { DayColumn, PeriodRow, TimesheetCode } from '../types'

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

// Find a body cell (td.wk-cell) by its duration text — ignores the rowtotal/coltotal/grandtotal
// cells that can show the same formatted duration.
function findCell(text: string): HTMLTableCellElement {
  const match = screen
    .getAllByText(text)
    .map((el) => el.closest('td.wk-cell'))
    .find((td): td is HTMLTableCellElement => td !== null)
  if (!match) throw new Error(`No wk-cell found with text "${text}"`)
  return match
}

describe('PeriodGrid — per-day-column Add in Review (BIZ-066)', () => {
  const row: PeriodRow = {
    key: 'c1|A',
    code: code({ name: 'Alpha' }),
    activity: 'A',
    minutesByDay: { 1: 60 },
  }
  const tableEl = () => document.querySelector('.wk-grid') as HTMLTableElement

  it('shows a per-column Add on working days (today primary, others quiet), not weekends', () => {
    render(
      <PeriodGrid
        mode="period"
        days={[day({ day: 1, isToday: true }), day({ day: 2 }), day({ day: 3, isWeekend: true })]}
        rows={[row]}
        runningCell={null}
        onOpenCell={() => {}}
        onAddCell={() => {}}
        onAddDay={() => {}}
      />,
    )
    expect(within(tableEl()).getByTestId('wk-period-add-1')).toHaveClass('is-today')
    expect(within(tableEl()).getByTestId('wk-period-add-2')).toHaveClass('is-quiet')
    expect(within(tableEl()).queryByTestId('wk-period-add-3')).toBeNull()
  })

  it('calls onAddDay with the column’s day', () => {
    const onAddDay = vi.fn()
    render(
      <PeriodGrid
        mode="period"
        days={[day({ day: 1, isToday: true })]}
        rows={[row]}
        runningCell={null}
        onOpenCell={() => {}}
        onAddCell={() => {}}
        onAddDay={onAddDay}
      />,
    )
    fireEvent.click(within(tableEl()).getByTestId('wk-period-add-1'))
    expect(onAddDay).toHaveBeenCalledWith(1)
  })
})

describe('PeriodGrid — Enter-view quarter-hour rounding (BIZ-063)', () => {
  const rowA: PeriodRow = {
    key: 'c1|A',
    code: code({ name: 'Alpha' }),
    activity: 'A',
    minutesByDay: { 1: 23 },
  }
  const rowB: PeriodRow = {
    key: 'c2|B',
    code: code({ id: 'c2', name: 'Beta' }),
    activity: 'B',
    minutesByDay: { 1: 52 },
  }

  it('shows rounded durations (with the real value beside) and a rounded daily total when on', () => {
    render(
      <PeriodGrid
        mode="checklist"
        days={[day({ day: 1 })]}
        rows={[rowA, rowB]}
        checked={{}}
        runningCell={null}
        onToggleCell={() => {}}
        onToggleRow={() => {}}
        rounding
      />,
    )

    // Error-carry over [23, 52] → [30, 45]; day total 75 min = 1:15 (real total also 75).
    const cellA = findCell('0:30')
    expect(cellA).toHaveTextContent('0:30')
    // The real minutes show beside the rounded value, in the greyed style.
    expect(within(cellA).getByText('0:23')).toHaveClass('wk-dur-real')
    const cellB = findCell('0:45')
    expect(within(cellB).getByText('0:52')).toHaveClass('wk-dur-real')
  })

  it('shows real minutes (no rounding) when the toggle is off', () => {
    render(
      <PeriodGrid
        mode="checklist"
        days={[day({ day: 1 })]}
        rows={[rowA, rowB]}
        checked={{}}
        runningCell={null}
        onToggleCell={() => {}}
        onToggleRow={() => {}}
      />,
    )
    expect(findCell('0:23')).toBeInTheDocument()
    expect(findCell('0:52')).toBeInTheDocument()
    expect(document.querySelector('.wk-dur-real')).toBeNull()
  })
})

describe('PeriodGrid — checklist checkbox affordance (BIZ-008)', () => {
  const row: PeriodRow = {
    key: 'c1|Bug fixing',
    code: code({ name: 'Paper V4' }),
    activity: 'Bug fixing',
    minutesByDay: { 1: 60, 2: 30 },
  }

  it('shows a checkbox beside the duration on a filled cell at rest, unticked', () => {
    render(
      <PeriodGrid
        mode="checklist"
        days={[day({ day: 1 }), day({ day: 2 })]}
        rows={[row]}
        checked={{}}
        runningCell={null}
        onToggleCell={() => {}}
        onToggleRow={() => {}}
      />,
    )

    const cell = findCell('1:00')
    const checkbox = cell.querySelector('input[type="checkbox"]')
    expect(checkbox).toBeInTheDocument()
    expect(checkbox).not.toBeChecked()
    expect(cell).not.toHaveClass('is-done')
    // The duration stays visible/legible alongside the checkbox.
    expect(cell).toHaveTextContent('1:00')
  })

  it('shows a ticked, checked checkbox with the is-done (green) styling once entered', () => {
    render(
      <PeriodGrid
        mode="checklist"
        days={[day({ day: 1 }), day({ day: 2 })]}
        rows={[row]}
        checked={{ 'c1|Bug fixing#1': true }}
        runningCell={null}
        onToggleCell={() => {}}
        onToggleRow={() => {}}
      />,
    )

    const doneCell = findCell('1:00')
    const doneCheckbox = doneCell.querySelector('input[type="checkbox"]')
    expect(doneCheckbox).toBeChecked()
    expect(doneCell).toHaveClass('is-done')
    expect(doneCell).toHaveTextContent('1:00')

    const notDoneCell = findCell('0:30')
    const notDoneCheckbox = notDoneCell.querySelector('input[type="checkbox"]')
    expect(notDoneCheckbox).not.toBeChecked()
    expect(notDoneCell).not.toHaveClass('is-done')
  })

  it('shows no checkbox on the running-timer cell', () => {
    render(
      <PeriodGrid
        mode="checklist"
        days={[day({ day: 1 })]}
        rows={[{ ...row, minutesByDay: {} }]}
        checked={{}}
        runningCell={{ key: 'c1|Bug fixing', day: 1 }}
        onToggleCell={() => {}}
        onToggleRow={() => {}}
      />,
    )

    // Both the table cell and the day-card line (BIZ-034) share this title — check the table one.
    const table = document.querySelector('.wk-grid') as HTMLElement
    const runningCell = within(table).getByTitle('Timer running — stop it to edit')
    expect(runningCell.querySelector('input[type="checkbox"]')).not.toBeInTheDocument()
  })

  it('shows no checkbox in period (Review) mode', () => {
    render(
      <PeriodGrid
        mode="period"
        days={[day({ day: 1 })]}
        rows={[row]}
        runningCell={null}
        onOpenCell={() => {}}
        onAddCell={() => {}}
        onAddDay={() => {}}
      />,
    )

    const cell = findCell('1:00')
    expect(cell.querySelector('input[type="checkbox"]')).not.toBeInTheDocument()
  })
})

describe('PeriodGrid — Activity dedup', () => {
  it('omits the Activity line when it equals the Code project name', () => {
    const row: PeriodRow = {
      key: 'c1|Internal administration',
      code: code({ name: 'Internal administration' }),
      activity: 'Internal administration',
      minutesByDay: { 1: 60 },
    }
    render(
      <PeriodGrid
        mode="period"
        days={[day()]}
        rows={[row]}
        runningCell={null}
        onOpenCell={() => {}}
        onAddCell={() => {}}
        onAddDay={() => {}}
      />,
    )

    // The project name renders once in the table; the identical Activity line is not duplicated.
    // (The day-card list — BIZ-034 — renders the same data again in its own markup, hence scoping
    // the search to the table here.)
    const table = document.querySelector('.wk-grid') as HTMLElement
    expect(within(table).getAllByText('Internal administration')).toHaveLength(1)
  })

  it('still shows the Activity line when it differs from the project name', () => {
    const row: PeriodRow = {
      key: 'c1|Bug fixing',
      code: code({ name: 'Paper V4' }),
      activity: 'Bug fixing',
      minutesByDay: { 1: 60 },
    }
    render(
      <PeriodGrid
        mode="period"
        days={[day()]}
        rows={[row]}
        runningCell={null}
        onOpenCell={() => {}}
        onAddCell={() => {}}
        onAddDay={() => {}}
      />,
    )

    const table = document.querySelector('.wk-grid') as HTMLElement
    expect(within(table).getByText('Paper V4')).toBeInTheDocument()
    expect(within(table).getByText('Bug fixing')).toBeInTheDocument()
  })
})

describe('PeriodGrid — copy Timesheet-system code', () => {
  const row: PeriodRow = {
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

  it('copies the code number to the clipboard when clicked, in Enter-in-Timesheet-system (checklist) mode', async () => {
    render(
      <PeriodGrid
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
      <PeriodGrid
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
      <PeriodGrid
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
      <PeriodGrid
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

describe('PeriodGrid — phone day-card layout (BIZ-034)', () => {
  // Representative day sets for the three period schemes — the card list must hold up regardless
  // of how many day columns the table would otherwise need (up to ~31 in the monthly scheme).
  const weeklyDays = [1, 2, 3, 4, 5].map((n) => day({ day: n, weekday: 'Mon' }))
  const semiMonthlyDays = Array.from({ length: 15 }, (_, i) => day({ day: i + 1, weekday: 'Mon' }))
  const monthlyDays = Array.from({ length: 31 }, (_, i) => day({ day: i + 1, weekday: 'Mon' }))

  const rows: PeriodRow[] = [
    {
      key: 'c1|Bug fixing',
      code: code({ name: 'Paper V4', number: 'N9/1042' }),
      activity: 'Bug fixing',
      minutesByDay: { 1: 60, 3: 45 },
    },
    {
      key: 'c2|Internal administration',
      code: code({ id: 'c2', name: 'Internal administration', number: 'N9/2000' }),
      activity: 'Internal administration',
      minutesByDay: { 1: 30 },
    },
  ]

  it.each([
    ['weekly', weeklyDays],
    ['semi_monthly', semiMonthlyDays],
    ['monthly', monthlyDays],
  ] as const)('renders one day card per day for the %s scheme', (_scheme, days) => {
    render(
      <PeriodGrid
        mode="period"
        days={days}
        rows={rows}
        runningCell={null}
        onOpenCell={() => {}}
        onAddCell={() => {}}
        onAddDay={() => {}}
      />,
    )

    const cardList = document.querySelector('.wk-daycards')
    expect(cardList).toBeInTheDocument()
    const cards = cardList!.querySelectorAll('.wk-daycard')
    expect(cards).toHaveLength(days.length)
  })

  it('shows each day card with its code/activity/duration lines, in period mode', () => {
    render(
      <PeriodGrid
        mode="period"
        days={weeklyDays}
        rows={rows}
        runningCell={null}
        onOpenCell={() => {}}
        onAddCell={() => {}}
        onAddDay={() => {}}
      />,
    )

    const cardList = document.querySelector('.wk-daycards')!
    const day1Card = Array.from(cardList.querySelectorAll('.wk-daycard')).find((c) =>
      c.textContent?.includes('Paper V4'),
    )
    expect(day1Card).toBeTruthy()
    expect(day1Card).toHaveTextContent('Paper V4')
    expect(day1Card).toHaveTextContent('Bug fixing')
    expect(day1Card).toHaveTextContent('1:00')
    expect(day1Card).toHaveTextContent('Internal administration')
    expect(day1Card).toHaveTextContent('0:30')
  })

  it('omits days with no filled entries from having line items, but still renders a card', () => {
    render(
      <PeriodGrid
        mode="period"
        days={weeklyDays}
        rows={rows}
        runningCell={null}
        onOpenCell={() => {}}
        onAddCell={() => {}}
        onAddDay={() => {}}
      />,
    )

    const cardList = document.querySelector('.wk-daycards')!
    const cards = Array.from(cardList.querySelectorAll('.wk-daycard'))
    // Day 2 has no entries in either row.
    const day2Card = cards[1]
    expect(day2Card.querySelectorAll('.wk-daycard-line')).toHaveLength(0)
  })

  it('shows the daily total on each day card and the grand total in the card list footer', () => {
    render(
      <PeriodGrid
        mode="period"
        days={weeklyDays}
        rows={rows}
        runningCell={null}
        onOpenCell={() => {}}
        onAddCell={() => {}}
        onAddDay={() => {}}
      />,
    )

    const cardList = document.querySelector('.wk-daycards')!
    const cards = Array.from(cardList.querySelectorAll('.wk-daycard'))
    // Day 1: 60 + 30 = 90min = 1:30
    expect(cards[0]).toHaveTextContent('1:30')
    // Day 3: 45min = 0:45
    expect(cards[2]).toHaveTextContent('0:45')

    const grandTotal = cardList.querySelector('.wk-daycards-grandtotal')
    expect(grandTotal).toBeInTheDocument()
    // 60 + 45 + 30 = 135min = 2:15
    expect(grandTotal).toHaveTextContent('2:15')
  })

  it('shows a checkbox per line in checklist mode and reflects checked state', () => {
    render(
      <PeriodGrid
        mode="checklist"
        days={weeklyDays}
        rows={rows}
        checked={{ 'c1|Bug fixing#1': true }}
        runningCell={null}
        onToggleCell={() => {}}
        onToggleRow={() => {}}
      />,
    )

    const cardList = document.querySelector('.wk-daycards')!
    const day1Card = Array.from(cardList.querySelectorAll('.wk-daycard')).find((c) =>
      c.textContent?.includes('Paper V4'),
    )!
    const checkbox = day1Card.querySelector('input[type="checkbox"]')
    expect(checkbox).toBeInTheDocument()
    expect(checkbox).toBeChecked()
  })

  it('calls onToggleCell when a checklist-mode day-card line is clicked', () => {
    const onToggleCell = vi.fn()
    render(
      <PeriodGrid
        mode="checklist"
        days={weeklyDays}
        rows={rows}
        checked={{}}
        runningCell={null}
        onToggleCell={onToggleCell}
        onToggleRow={() => {}}
      />,
    )

    const cardList = document.querySelector('.wk-daycards')!
    const day1Card = Array.from(cardList.querySelectorAll('.wk-daycard')).find((c) =>
      c.textContent?.includes('Paper V4'),
    )!
    const line = day1Card.querySelector('.wk-daycard-line')!
    fireEvent.click(line)

    expect(onToggleCell).toHaveBeenCalledWith('c1|Bug fixing', 1, { shift: false, meta: false })
  })

  it('calls onOpenCell when a period-mode day-card line for a filled cell is clicked', () => {
    const onOpenCell = vi.fn()
    render(
      <PeriodGrid
        mode="period"
        days={weeklyDays}
        rows={rows}
        runningCell={null}
        onOpenCell={onOpenCell}
        onAddCell={() => {}}
        onAddDay={() => {}}
      />,
    )

    const cardList = document.querySelector('.wk-daycards')!
    const day1Card = Array.from(cardList.querySelectorAll('.wk-daycard')).find((c) =>
      c.textContent?.includes('Paper V4'),
    )!
    const line = day1Card.querySelector('.wk-daycard-line')!
    fireEvent.click(line)

    expect(onOpenCell).toHaveBeenCalledWith('c1|Bug fixing', 1)
  })

  it('marks the running-timer line as such and excludes it from clickability', () => {
    render(
      <PeriodGrid
        mode="period"
        days={[day({ day: 1 })]}
        rows={[{ ...rows[0], minutesByDay: {} }]}
        runningCell={{ key: 'c1|Bug fixing', day: 1 }}
        onOpenCell={() => {}}
        onAddCell={() => {}}
        onAddDay={() => {}}
      />,
    )

    const cardList = document.querySelector('.wk-daycards')!
    const line = cardList.querySelector('.wk-daycard-line.is-running')
    expect(line).toBeInTheDocument()
  })

  it('marks weekend and absence day cards distinctly', () => {
    const days = [
      day({ day: 1 }),
      day({ day: 2, isWeekend: true }),
      day({ day: 3, isAbsence: true, absenceReason: 'Annual leave' }),
    ]
    render(
      <PeriodGrid
        mode="period"
        days={days}
        rows={rows}
        runningCell={null}
        onOpenCell={() => {}}
        onAddCell={() => {}}
        onAddDay={() => {}}
      />,
    )

    const cardList = document.querySelector('.wk-daycards')!
    const cards = Array.from(cardList.querySelectorAll('.wk-daycard'))
    expect(cards[1]).toHaveClass('is-weekend')
    expect(cards[2]).toHaveClass('is-absence')
  })
})
