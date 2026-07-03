import { describe, expect, it } from 'vitest'
import { errorMessage } from './toastContext'

describe('errorMessage', () => {
  it('appends the underlying Error message to the fallback', () => {
    expect(errorMessage(new Error('500 Internal Server Error'), 'Could not save.')).toBe(
      'Could not save. — 500 Internal Server Error',
    )
  })

  it('falls back to the plain message when the error has no message', () => {
    expect(errorMessage(new Error(''), 'Could not save.')).toBe('Could not save.')
  })

  it('falls back to the plain message for a non-Error thrown value', () => {
    expect(errorMessage('boom', 'Could not save.')).toBe('Could not save.')
  })
})
