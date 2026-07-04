import type { ActivityName, Entry } from '../types'

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
