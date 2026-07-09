import { describe, expect, it } from 'vitest'
import { PALETTE, isPaletteColor, leastUsedColors, suggestColor } from './palette'
import fixture from '../../../tests/fixtures/palette.json'

/**
 * Contract test (BIZ-048): the frontend palette must equal the shared fixture, which the backend's
 * `walker/services/palette.py` also asserts against — so backend and frontend stay identical or a
 * test fails. Same pattern as `virtualCodeResolution.contract.test.ts`.
 */

const data = fixture as { palette: string[] }

describe('palette contract with backend walker.services.palette', () => {
  it('matches the shared fixture exactly', () => {
    expect(PALETTE).toEqual(data.palette)
  })

  it('is 64 unique colours', () => {
    expect(PALETTE).toHaveLength(64)
    expect(new Set(PALETTE).size).toBe(64)
  })
})

describe('leastUsedColors', () => {
  it('excludes every used colour while free colours remain', () => {
    const used = PALETTE.slice(0, 3)
    const candidates = leastUsedColors(used)
    expect(candidates).toHaveLength(61)
    expect(candidates.some((c) => used.includes(c))).toBe(false)
  })

  it('ignores colours outside the palette (legacy / analog picks)', () => {
    expect(leastUsedColors(['#000000', '#ffffff', 'nope'])).toEqual(PALETTE)
  })

  it('is case-insensitive', () => {
    expect(leastUsedColors([PALETTE[0].toUpperCase()])).not.toContain(PALETTE[0])
  })

  it('degrades to count 1 once all 64 are used', () => {
    expect(new Set(leastUsedColors(PALETTE)).size).toBe(64)
    const candidates = leastUsedColors([...PALETTE, PALETTE[0]])
    expect(candidates).toHaveLength(63)
    expect(candidates).not.toContain(PALETTE[0])
  })
})

describe('suggestColor', () => {
  it('never repeats an in-use colour while free colours remain', () => {
    const used = [PALETTE[0]]
    for (let i = 0; i < 50; i++) expect(suggestColor(used)).not.toBe(PALETTE[0])
  })
})

describe('isPaletteColor', () => {
  it('recognises palette members case-insensitively and rejects others', () => {
    expect(isPaletteColor(PALETTE[5].toUpperCase())).toBe(true)
    expect(isPaletteColor('#123456')).toBe(false)
  })
})
