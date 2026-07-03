import { describe, expect, it } from 'vitest'
import { shouldRetagInPlace } from './timer'

describe('shouldRetagInPlace', () => {
  it('re-tags an empty capture-first stub in place (no phantom split)', () => {
    expect(shouldRetagInPlace({ codeId: null, description: '' })).toBe(true)
  })

  it('treats a whitespace-only description as an empty stub', () => {
    expect(shouldRetagInPlace({ codeId: null, description: '   ' })).toBe(true)
  })

  it('splits when the running entry already carries a description', () => {
    expect(shouldRetagInPlace({ codeId: null, description: 'writing spec' })).toBe(false)
  })

  it('splits when the running entry is already categorized (genuine task change)', () => {
    expect(shouldRetagInPlace({ codeId: '3', description: '' })).toBe(false)
  })

  it('is false when nothing is running', () => {
    expect(shouldRetagInPlace(null)).toBe(false)
  })
})
