import { describe, expect, it } from 'vitest'
import { compareTimesheetOrder, resolveChecklistRows } from './checklist'
import type { PeriodRow, TimesheetCode } from '../types'

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
    const rows: PeriodRow[] = [
      { key: '2|Bug fixing', code: virtualA, activity: 'Bug fixing', minutesByDay: { 1: 60 } },
      {
        key: '3|Bug fixing',
        code: virtualB,
        activity: 'Bug fixing',
        minutesByDay: { 1: 30, 2: 15 },
      },
    ]

    const result = resolveChecklistRows(rows, codesById)

    expect(result).toHaveLength(1)
    expect(result[0].code.id).toBe('1')
    expect(result[0].key).toBe('1|Bug fixing')
    expect(result[0].minutesByDay).toEqual({ 1: 90, 2: 15 })
  })

  it('passes a real code with no virtual through unchanged', () => {
    const rows: PeriodRow[] = [
      { key: '1|Bug fixing', code: realCode, activity: 'Bug fixing', minutesByDay: { 1: 45 } },
    ]

    const result = resolveChecklistRows(rows, codesById)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject(rows[0])
  })

  it('OR-combines the manual flag when virtual rows merge into their real code (BIZ-065)', () => {
    const rows: PeriodRow[] = [
      {
        key: '2|Bug fixing',
        code: virtualA,
        activity: 'Bug fixing',
        minutesByDay: { 1: 60 },
        manualByDay: { 1: false },
      },
      {
        key: '3|Bug fixing',
        code: virtualB,
        activity: 'Bug fixing',
        minutesByDay: { 1: 30 },
        manualByDay: { 1: true },
      },
    ]

    const result = resolveChecklistRows(rows, codesById)

    expect(result).toHaveLength(1)
    expect(result[0].manualByDay).toEqual({ 1: true })
  })

  it('keeps virtual codes on different real codes as separate rows', () => {
    const otherReal: TimesheetCode = { ...realCode, id: '9' }
    const virtualC: TimesheetCode = { ...virtualA, id: '4', realCodeId: '9' }
    const rows: PeriodRow[] = [
      { key: '2|Bug fixing', code: virtualA, activity: 'Bug fixing', minutesByDay: { 1: 60 } },
      { key: '4|Bug fixing', code: virtualC, activity: 'Bug fixing', minutesByDay: { 1: 20 } },
    ]

    const result = resolveChecklistRows(rows, { ...codesById, '9': otherReal, '4': virtualC })

    expect(result).toHaveLength(2)
    const keys = result.map((r) => r.key).sort()
    expect(keys).toEqual(['1|Bug fixing', '9|Bug fixing'])
  })

  it('orders the resolved rows to match the T&E grid (BIZ-068)', () => {
    const n: TimesheetCode = { ...realCode, id: '10', label: 'Zeta', type: 'N', customer: 'ACME' }
    const c: TimesheetCode = { ...realCode, id: '11', label: 'Alpha', type: 'C', customer: 'ACME' }
    const rows: PeriodRow[] = [
      { key: '10|x', code: n, activity: 'x', minutesByDay: {} },
      { key: '11|x', code: c, activity: 'x', minutesByDay: {} },
    ]
    const result = resolveChecklistRows(rows, { '10': n, '11': c })
    // Chargeable (C) block comes before Non-chargeable (N), regardless of label/insertion order.
    expect(result.map((r) => r.code.id)).toEqual(['11', '10'])
  })
})

// Build a real code carrying the T&E ordering keys.
function teCode(over: Partial<TimesheetCode>): TimesheetCode {
  return { ...realCode, activities: [], ...over }
}
function teRow(code: TimesheetCode, activity = 'act'): PeriodRow {
  return { key: `${code.id}|${activity}`, code, activity, minutesByDay: {} }
}

describe('compareTimesheetOrder (BIZ-068)', () => {
  it('blocks by type C < N < A, then unknown/null last', () => {
    const rows = [
      teRow(teCode({ id: 'a', type: 'A' })),
      teRow(teCode({ id: 'none', type: null })),
      teRow(teCode({ id: 'n', type: 'N' })),
      teRow(teCode({ id: 'c', type: 'C' })),
    ]
    expect([...rows].sort(compareTimesheetOrder).map((r) => r.code.id)).toEqual([
      'c',
      'n',
      'a',
      'none',
    ])
  })

  it('within a type, orders by customer then label then activity', () => {
    const rows = [
      teRow(teCode({ id: '3', type: 'N', customer: 'Beta', label: 'Zzz' })),
      teRow(teCode({ id: '2', type: 'N', customer: 'Alpha', label: 'Zzz' })),
      teRow(teCode({ id: '1', type: 'N', customer: 'Alpha', label: 'Aaa' })),
    ]
    expect([...rows].sort(compareTimesheetOrder).map((r) => r.code.id)).toEqual(['1', '2', '3'])
  })

  it('breaks ties on the activity label', () => {
    const code = teCode({ id: '1', type: 'N', customer: 'X', label: 'L' })
    const rows = [teRow(code, 'Support'), teRow(code, 'Analysis')]
    expect([...rows].sort(compareTimesheetOrder).map((r) => r.activity)).toEqual([
      'Analysis',
      'Support',
    ])
  })

  it('compares case-sensitively (uppercase before lowercase), like T&E — not localeCompare', () => {
    const upper = teRow(teCode({ id: 'U', type: 'N', customer: 'C', label: 'Zebra' }))
    const lower = teRow(teCode({ id: 'L', type: 'N', customer: 'C', label: 'apple' }))
    // Raw JS string compare puts 'Zebra' (Z=90) before 'apple' (a=97); localeCompare would not.
    expect([...[lower, upper]].sort(compareTimesheetOrder).map((r) => r.code.id)).toEqual([
      'U',
      'L',
    ])
  })
})
