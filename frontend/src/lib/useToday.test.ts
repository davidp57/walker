import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useToday } from './useToday'

describe('useToday (BIZ-091)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('starts on the current civil day', () => {
    vi.setSystemTime(new Date(2026, 7, 20, 10, 0, 0))

    const { result } = renderHook(() => useToday())

    expect(result.current).toBe('2026-08-20')
  })

  it('rolls over to the new day without a reload — the overnight case', () => {
    vi.setSystemTime(new Date(2026, 7, 20, 23, 59, 30))
    const { result } = renderHook(() => useToday())
    expect(result.current).toBe('2026-08-20')

    act(() => {
      vi.setSystemTime(new Date(2026, 7, 21, 9, 2, 0))
      vi.advanceTimersByTime(30_000)
    })

    expect(result.current).toBe('2026-08-21')
  })

  it('updates as soon as the tab regains focus, without waiting for the tick', () => {
    vi.setSystemTime(new Date(2026, 7, 20, 22, 0, 0))
    const { result } = renderHook(() => useToday())

    act(() => {
      vi.setSystemTime(new Date(2026, 7, 21, 8, 50, 0))
      window.dispatchEvent(new Event('focus'))
    })

    expect(result.current).toBe('2026-08-21')
  })

  it('stops checking once unmounted', () => {
    vi.setSystemTime(new Date(2026, 7, 20, 10, 0, 0))
    const { unmount } = renderHook(() => useToday())
    const clearInterval = vi.spyOn(window, 'clearInterval')

    unmount()

    expect(clearInterval).toHaveBeenCalled()
  })
})
