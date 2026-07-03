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
