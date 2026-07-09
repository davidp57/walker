import { describe, expect, it } from 'vitest'
import { searchUserCodes, sortReferenceByName } from './codeSearch'
import type { ReferenceCode, TimesheetCode } from '../types'

function code(over: Partial<TimesheetCode> & { id: string; name: string }): TimesheetCode {
  return {
    number: 'N9/1',
    label: 'L',
    color: '#111',
    activities: [{ code: '0001', label: 'Bug fixing' }],
    isVirtual: false,
    realCodeId: null,
    realCodeNumber: null,
    ...over,
  }
}

function ref(over: Partial<ReferenceCode> & { id: string; name: string }): ReferenceCode {
  return { number: 'N9/9', label: 'L', activities: [], ...over }
}

describe('searchUserCodes', () => {
  const zebra = code({ id: '1', name: 'Zebra' })
  const apple = code({ id: '2', name: 'Apple' })
  const mango = code({ id: '3', name: 'Mango', isVirtual: true, realCodeId: '1' })

  it('sorts matches by name, not by insertion/number order', () => {
    const result = searchUserCodes([zebra, apple, mango], '')
    expect(result.map((r) => r.code.name)).toEqual(['Apple', 'Mango', 'Zebra'])
  })

  it('includes real and virtual codes by default', () => {
    const result = searchUserCodes([zebra, mango], '')
    expect(result.map((r) => r.code.id).sort()).toEqual(['1', '3'])
  })

  it('excludes virtual codes when realOnly', () => {
    const result = searchUserCodes([zebra, mango], '', { realOnly: true })
    expect(result.map((r) => r.code.id)).toEqual(['1'])
  })

  it('matches on number, name, and label', () => {
    const codes = [
      code({ id: '1', name: 'Alpha', number: 'X1', label: 'lbl' }),
      code({ id: '2', name: 'Beta', number: 'Y2', label: 'special' }),
    ]
    expect(searchUserCodes(codes, 'special').map((r) => r.code.id)).toEqual(['2'])
    expect(searchUserCodes(codes, 'x1').map((r) => r.code.id)).toEqual(['1'])
  })

  it('in codeOnly mode ignores activities and shows none', () => {
    const withActs = code({ id: '1', name: 'Alpha', activities: [{ code: '0001', label: 'Bug' }] })
    const [match] = searchUserCodes([withActs], '', { codeOnly: true })
    expect(match.activities).toEqual([])
  })

  it('in codeOnly mode keeps a code with no activities', () => {
    const noActs = code({ id: '1', name: 'Alpha', activities: [] })
    expect(searchUserCodes([noActs], '', { codeOnly: true })).toHaveLength(1)
  })

  it('outside codeOnly, filters activities by the query', () => {
    const c = code({
      id: '1',
      name: 'Alpha',
      activities: [
        { code: '0001', label: 'Bug fixing' },
        { code: '0002', label: 'Meetings' },
      ],
    })
    const [match] = searchUserCodes([c], 'meet')
    expect(match.activities.map((a) => a.label)).toEqual(['Meetings'])
  })
})

describe('sortReferenceByName', () => {
  it('drops already-active numbers and sorts the rest by name', () => {
    const refs = [
      ref({ id: '1', name: 'Yak', number: 'A' }),
      ref({ id: '2', name: 'Cat', number: 'B' }),
      ref({ id: '3', name: 'Dog', number: 'C' }),
    ]
    const result = sortReferenceByName(refs, new Set(['B']))
    expect(result.map((r) => r.name)).toEqual(['Dog', 'Yak'])
  })
})
