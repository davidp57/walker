import { describe, expect, it } from 'vitest'
import { lastDescriptionFor, soleActivity } from './tasks'
import type { Entry, TimesheetCode } from '../types'

const code = (activities: { code: string; label: string }[]): TimesheetCode => ({
  id: '1',
  number: 'N9/1042',
  name: 'Paper V4',
  label: 'MNT - PAP V4',
  color: '#5b9cf6',
  activities,
  isVirtual: false,
  realCodeId: null,
  realCodeNumber: null,
})

describe('soleActivity', () => {
  it('returns null when there is no code', () => {
    expect(soleActivity(null)).toBeNull()
  })

  it('returns null when the code has no activities', () => {
    expect(soleActivity(code([]))).toBeNull()
  })

  it('returns the activity label when the code has exactly one', () => {
    expect(soleActivity(code([{ code: '0001', label: 'Bug fixing' }]))).toBe('Bug fixing')
  })

  it('returns null when the code has several activities (ambiguous — defer)', () => {
    expect(
      soleActivity(
        code([
          { code: '0001', label: 'Bug fixing' },
          { code: '0002', label: 'Design' },
        ]),
      ),
    ).toBeNull()
  })
})

const entry = (patch: Partial<Entry>): Entry => ({
  id: '1',
  date: '2026-07-01',
  start: 540,
  end: 600,
  codeId: '1',
  activity: 'Bug fixing',
  description: '',
  ...patch,
})

describe('lastDescriptionFor', () => {
  it('returns null when there is no matching entry', () => {
    expect(lastDescriptionFor([], '1', 'Bug fixing')).toBeNull()
  })

  it('returns null when the only matches have a blank description', () => {
    const entries = [entry({ description: '' }), entry({ description: '   ' })]
    expect(lastDescriptionFor(entries, '1', 'Bug fixing')).toBeNull()
  })

  it('ignores entries for a different code or activity', () => {
    const entries = [
      entry({ codeId: '2', description: 'other code' }),
      entry({ activity: 'Design', description: 'other activity' }),
    ]
    expect(lastDescriptionFor(entries, '1', 'Bug fixing')).toBeNull()
  })

  it('returns the most recent (latest date) description', () => {
    const entries = [
      entry({ date: '2026-06-20', description: 'older' }),
      entry({ date: '2026-07-01', description: 'newer' }),
    ]
    expect(lastDescriptionFor(entries, '1', 'Bug fixing')).toBe('newer')
  })

  it('breaks ties on the same date by latest start-of-day', () => {
    const entries = [
      entry({ date: '2026-07-01', start: 540, description: 'earlier in the day' }),
      entry({ date: '2026-07-01', start: 900, description: 'later in the day' }),
    ]
    expect(lastDescriptionFor(entries, '1', 'Bug fixing')).toBe('later in the day')
  })

  it('works the same for a virtual code id (a plain FK, no special-casing needed)', () => {
    const entries = [entry({ codeId: '42', activity: 'Bug fixing', description: 'workday note' })]
    expect(lastDescriptionFor(entries, '42', 'Bug fixing')).toBe('workday note')
  })
})
