import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
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

describe('FortnightGrid — checklist checkbox affordance (BIZ-008)', () => {
  const row: FortnightRow = {
    key: 'c1|Bug fixing',
    code: code({ name: 'Paper V4' }),
    activity: 'Bug fixing',
    minutesByDay: { 1: 60, 2: 30 },
  }

  it('shows a checkbox beside the duration on a filled cell at rest, unticked', () => {
    render(
      <FortnightGrid
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
      <FortnightGrid
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
      <FortnightGrid
        mode="checklist"
        days={[day({ day: 1 })]}
        rows={[{ ...row, minutesByDay: {} }]}
        checked={{}}
        runningCell={{ key: 'c1|Bug fixing', day: 1 }}
        onToggleCell={() => {}}
        onToggleRow={() => {}}
      />,
    )

    const runningCell = screen.getByTitle('Timer running — stop it to edit')
    expect(runningCell.querySelector('input[type="checkbox"]')).not.toBeInTheDocument()
  })

  it('shows no checkbox in fortnight (Review) mode', () => {
    render(
      <FortnightGrid
        mode="fortnight"
        days={[day({ day: 1 })]}
        rows={[row]}
        runningCell={null}
        onOpenCell={() => {}}
        onAddCell={() => {}}
      />,
    )

    const cell = findCell('1:00')
    expect(cell.querySelector('input[type="checkbox"]')).not.toBeInTheDocument()
  })
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
