import { describe, expect, it } from 'vitest'
import { formatList } from './text'

describe('formatList', () => {
  it('returns an empty string for no items', () => {
    expect(formatList([])).toBe('')
  })

  it('returns the sole item unchanged', () => {
    expect(formatList(['a number'])).toBe('a number')
  })

  it('joins two items with "and"', () => {
    expect(formatList(['a number', 'a name'])).toBe('a number and a name')
  })

  it('joins three or more with commas and a trailing "and"', () => {
    expect(formatList(['a number', 'a technical label', 'an activity'])).toBe(
      'a number, a technical label and an activity',
    )
  })
})
