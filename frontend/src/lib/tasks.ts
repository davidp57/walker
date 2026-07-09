import type { ActivityName, Entry, TimesheetCode } from '../types'

/**
 * The Activity to auto-fill when starting a Timer from a Task in one click (BIZ-050): the code's
 * activity when it has exactly one (unambiguous), otherwise `null` — no code, no activities, or
 * several all leave it to categorize later. Keeps the one-click start from ever guessing.
 */
export function soleActivity(code: TimesheetCode | null): ActivityName | null {
  const activities = code?.activities ?? []
  return activities.length === 1 ? activities[0].label : null
}

/**
 * The most recent non-blank description used for a given code + activity, or `null` when none.
 *
 * Used to prefill an entry's description the moment a code (real or virtual — BIZ-013) + activity
 * is picked, mirroring how the Timesheet period "add in cell" flow prefills from the most recent
 * comment on that cell (see `openAddInCell` in `App.tsx`). Ordered by recency: latest date, then
 * latest start-of-day wins.
 */
export function lastDescriptionFor(
  entries: Entry[],
  codeId: string,
  activity: ActivityName,
): string | null {
  const match = entries
    .filter((e) => e.codeId === codeId && e.activity === activity && e.description.trim() !== '')
    .sort((a, b) => (a.date === b.date ? b.start - a.start : b.date.localeCompare(a.date)))[0]
  return match?.description ?? null
}
