import { describe, expect, it } from 'vitest'
import { roundQuarterHourCarry } from './rounding'

describe('roundQuarterHourCarry', () => {
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

  it('rounds every value to a multiple of 15', () => {
    const out = roundQuarterHourCarry([23, 52, 10, 7])
    for (const v of out) expect(v % 15).toBe(0)
  })

  it('carries the error so the total stays closest to the real total (five 6-minute cells → 30)', () => {
    expect(roundQuarterHourCarry([6, 6, 6, 6, 6])).toEqual([0, 15, 0, 15, 0])
  })

  it('keeps the rounded total within a quarter-hour of the real total', () => {
    const real = [23, 52, 10]
    const out = roundQuarterHourCarry(real)
    expect(out).toEqual([30, 45, 15]) // real total 85 → nearest quarter 90
    expect(Math.abs(sum(out) - sum(real))).toBeLessThan(15)
  })

  it('leaves exact quarter-hours untouched and doesn’t drift', () => {
    expect(roundQuarterHourCarry([15, 30, 45])).toEqual([15, 30, 45])
  })

  it('handles zeros without accumulating error', () => {
    expect(roundQuarterHourCarry([0, 0, 30])).toEqual([0, 0, 30])
  })

  it('is empty-safe', () => {
    expect(roundQuarterHourCarry([])).toEqual([])
  })
})
