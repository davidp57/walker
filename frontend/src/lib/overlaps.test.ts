import { describe, expect, it } from 'vitest'
import { detectOverlaps } from './overlaps'

// Minutes since midnight: 9:00 = 540, 10:00 = 600, 11:00 = 660, 12:00 = 720, 14:00 = 840.

describe('detectOverlaps', () => {
  it('reports no overlap for sequential entries', () => {
    const info = detectOverlaps([
      { id: 'a', start: 540, end: 600 },
      { id: 'b', start: 600, end: 660 }, // touches a's end — not an overlap
    ])
    expect(info.a.partners).toEqual([])
    expect(info.b.partners).toEqual([])
    expect(info.a.fixEnd).toBeNull()
  })

  it('flags a staggered overlap on both entries and offers the earlier one a trim', () => {
    const info = detectOverlaps([
      { id: 'a', start: 540, end: 660 }, // 9:00–11:00
      { id: 'b', start: 600, end: 720 }, // 10:00–12:00
    ])
    expect(info.a.partners).toEqual([{ id: 'b', start: 600, end: 720 }])
    expect(info.b.partners).toEqual([{ id: 'a', start: 540, end: 660 }])
    expect(info.a.fixEnd).toBe(600) // trim a's end to b's start
    expect(info.b.fixEnd).toBeNull() // the later entry is not the one trimmed
  })

  it('flags a nested overlap on both but offers no trim', () => {
    const info = detectOverlaps([
      { id: 'a', start: 540, end: 840 }, // 9:00–14:00 contains b
      { id: 'b', start: 600, end: 660 }, // 10:00–11:00
    ])
    expect(info.a.partners).toHaveLength(1)
    expect(info.b.partners).toHaveLength(1)
    expect(info.a.fixEnd).toBeNull()
    expect(info.b.fixEnd).toBeNull()
  })

  it('flags a same-start overlap on both but offers no trim', () => {
    const info = detectOverlaps([
      { id: 'a', start: 600, end: 660 },
      { id: 'b', start: 600, end: 720 },
    ])
    expect(info.a.partners).toHaveLength(1)
    expect(info.b.partners).toHaveLength(1)
    expect(info.a.fixEnd).toBeNull()
    expect(info.b.fixEnd).toBeNull()
  })

  it('excludes the running entry (null end) from detection', () => {
    const info = detectOverlaps([
      { id: 'a', start: 540, end: 660 },
      { id: 'run', start: 600, end: null }, // running timer
    ])
    expect(info.a.partners).toEqual([])
    expect(info.run).toBeUndefined()
  })

  it('trims to the earliest later start when an entry overlaps several', () => {
    const info = detectOverlaps([
      { id: 'a', start: 540, end: 720 }, // 9:00–12:00
      { id: 'b', start: 660, end: 780 }, // 11:00–13:00 (staggered, later)
      { id: 'c', start: 600, end: 900 }, // 10:00–15:00 (staggered, earlier of the two)
    ])
    // a overlaps both b and c; the safe trim pulls a's end to the earliest later start (c at 600).
    expect(info.a.partners).toHaveLength(2)
    expect(info.a.fixEnd).toBe(600)
  })
})
