import { describe, expect, it } from 'vitest'
import { formatClock, formatDuration, parseDuration, parseMilitaryClock } from './time'

describe('parseMilitaryClock', () => {
  it('accepts both "hhmm" and "hh:mm"', () => {
    expect(parseMilitaryClock('1345')).toBe(13 * 60 + 45)
    expect(parseMilitaryClock('13:45')).toBe(13 * 60 + 45)
  })

  it('accepts short forms "h:mm", "hmm", "hh", "h"', () => {
    expect(parseMilitaryClock('9:05')).toBe(9 * 60 + 5)
    expect(parseMilitaryClock('905')).toBe(9 * 60 + 5)
    expect(parseMilitaryClock('930')).toBe(9 * 60 + 30)
    expect(parseMilitaryClock('09')).toBe(9 * 60)
    expect(parseMilitaryClock('9')).toBe(9 * 60)
  })

  it('clamps out-of-range and rejects empty', () => {
    expect(parseMilitaryClock('2599')).toBe(23 * 60 + 59)
    expect(parseMilitaryClock('')).toBeNull()
    expect(parseMilitaryClock('abc')).toBeNull()
  })

  it('round-trips through formatClock', () => {
    expect(formatClock(parseMilitaryClock('13:45') ?? 0)).toBe('13:45')
  })
})

describe('parseDuration', () => {
  it('accepts "h:mm" and "hmm" and plain minutes', () => {
    expect(parseDuration('1:30')).toBe(90)
    expect(parseDuration('130')).toBe(90)
    expect(parseDuration('45')).toBe(45)
    expect(parseDuration('2:05')).toBe(125)
    expect(parseDuration('')).toBe(0)
  })

  it('round-trips through formatDuration', () => {
    expect(formatDuration(parseDuration('2:05'))).toBe('2:05')
  })
})
