import { describe, expect, it } from 'vitest'
import { describeDue } from './dueDate'

describe('describeDue', () => {
  const today = '2026-07-10'

  it('labels the due date relative to today', () => {
    expect(describeDue('2026-07-10', today)).toMatchObject({
      label: 'Today',
      dueToday: true,
      overdue: false,
    })
    expect(describeDue('2026-07-11', today)).toMatchObject({
      label: 'Tomorrow',
      dueToday: false,
      overdue: false,
    })
    expect(describeDue('2026-07-09', today)).toMatchObject({
      label: 'Yesterday',
      dueToday: false,
      overdue: true,
    })
    expect(describeDue('2026-07-13', today).label).toBe('in 3d')
    expect(describeDue('2026-07-07', today).label).toBe('3d overdue')
  })

  it('flags overdue for any past date and due-today only for the exact day', () => {
    expect(describeDue('2026-07-09', today).overdue).toBe(true)
    expect(describeDue('2026-06-01', today).overdue).toBe(true)
    expect(describeDue('2026-07-11', today).overdue).toBe(false)
    expect(describeDue('2026-07-10', today).dueToday).toBe(true)
    expect(describeDue('2026-07-11', today).dueToday).toBe(false)
  })

  it('counts real calendar days across month and year boundaries', () => {
    expect(describeDue('2026-08-01', '2026-07-31').label).toBe('Tomorrow')
    expect(describeDue('2027-01-01', '2026-12-31').label).toBe('Tomorrow')
    expect(describeDue('2026-07-31', '2026-08-02').label).toBe('2d overdue')
  })
})
