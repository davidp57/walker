import { describe, expect, it } from 'vitest'
import { resolveChecklistRows } from './checklist'
import type { FortnightRow, TimesheetCode } from '../types'

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

const virtualA: TimesheetCode = {
  id: '2',
  number: 'N9/1042',
  label: 'MNT - PAP V4',
  name: 'Project A',
  color: '#abcdef',
  activities: [{ code: '0001', label: 'Bug fixing' }],
  isVirtual: true,
  realCodeId: '1',
  realCodeNumber: 'N9/1042',
}

const virtualB: TimesheetCode = {
  id: '3',
  number: 'N9/1042',
  label: 'MNT - PAP V4',
  name: 'Project B',
  color: '#123456',
  activities: [{ code: '0001', label: 'Bug fixing' }],
  isVirtual: true,
  realCodeId: '1',
  realCodeNumber: 'N9/1042',
}

const codesById: Record<string, TimesheetCode> = {
  '1': realCode,
  '2': virtualA,
  '3': virtualB,
}

describe('resolveChecklistRows', () => {
  it('collapses virtual codes sharing a real code into one row, summing minutes exactly', () => {
    const rows: FortnightRow[] = [
      { key: '2|Bug fixing', code: virtualA, activity: 'Bug fixing', minutesByDay: { 1: 60 } },
      { key: '3|Bug fixing', code: virtualB, activity: 'Bug fixing', minutesByDay: { 1: 30, 2: 15 } },
    ]

    const result = resolveChecklistRows(rows, codesById)

    expect(result).toHaveLength(1)
    expect(result[0].code.id).toBe('1')
    expect(result[0].key).toBe('1|Bug fixing')
    expect(result[0].minutesByDay).toEqual({ 1: 90, 2: 15 })
  })

  it('passes a real code with no virtual through unchanged', () => {
    const rows: FortnightRow[] = [
      { key: '1|Bug fixing', code: realCode, activity: 'Bug fixing', minutesByDay: { 1: 45 } },
    ]

    const result = resolveChecklistRows(rows, codesById)

    expect(result).toEqual(rows)
  })

  it('keeps virtual codes on different real codes as separate rows', () => {
    const otherReal: TimesheetCode = { ...realCode, id: '9' }
    const virtualC: TimesheetCode = { ...virtualA, id: '4', realCodeId: '9' }
    const rows: FortnightRow[] = [
      { key: '2|Bug fixing', code: virtualA, activity: 'Bug fixing', minutesByDay: { 1: 60 } },
      { key: '4|Bug fixing', code: virtualC, activity: 'Bug fixing', minutesByDay: { 1: 20 } },
    ]

    const result = resolveChecklistRows(rows, { ...codesById, '9': otherReal, '4': virtualC })

    expect(result).toHaveLength(2)
    const keys = result.map((r) => r.key).sort()
    expect(keys).toEqual(['1|Bug fixing', '9|Bug fixing'])
  })
})
