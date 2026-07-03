import type { FocusEvent } from 'react'

/** Parse a military-time string into minutes-since-midnight. "1345" -> 825, "930" -> 570, "9" -> 540. */
export function parseMilitaryClock(input: string): number | null {
  const d = (input || '').replace(/[^0-9]/g, '')
  if (!d) return null
  let h: number
  let m: number
  if (d.length <= 2) {
    h = +d
    m = 0
  } else if (d.length === 3) {
    h = +d.slice(0, 1)
    m = +d.slice(1)
  } else {
    h = +d.slice(0, 2)
    m = +d.slice(2, 4)
  }
  if (h > 23) h = 23
  if (m > 59) m = 59
  return h * 60 + m
}

/** minutes-since-midnight -> "HH:MM" (24h). */
export function formatClock(min: number): string {
  const m = ((min % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** Parse a duration entry. "1:30"/"130" -> 90, "45" -> 45, "" -> 0. */
export function parseDuration(input: string): number {
  const s = (input || '').trim()
  if (s.includes(':')) {
    const [a, b] = s.split(':')
    return (+a || 0) * 60 + +(b || 0)
  }
  const d = s.replace(/[^0-9]/g, '')
  if (!d) return 0
  if (d.length <= 2) return +d
  if (d.length === 3) return +d.slice(0, 1) * 60 + +d.slice(1)
  return +d.slice(0, 2) * 60 + +d.slice(2, 4)
}

/** minutes -> "H:MM" (real, unrounded). */
export function formatDuration(min: number): string {
  if (!min) return '0:00'
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`
}

/** seconds -> "H:MM:SS" for the running Timer. */
export function formatStopwatch(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/**
 * Elapsed seconds for a running Timer, from the Entry's real start (its `date` + minutes-since-
 * midnight `start`) to `nowMs`. Anchoring on the entry's own date — rather than local midnight —
 * keeps this correct for a timer left running across midnight, or one whose start is not "today".
 */
export function elapsedSecondsSince(date: string, startMinute: number, nowMs: number): number {
  const [y, m, d] = date.split('-').map(Number)
  const startMs = new Date(y, m - 1, d, 0, startMinute, 0).getTime()
  return Math.max(0, (nowMs - startMs) / 1000)
}

/** Select-all helper for inline edit inputs. */
export const selectOnFocus = (e: FocusEvent<HTMLInputElement>): void => {
  try {
    e.target.select()
  } catch {
    /* noop */
  }
}
