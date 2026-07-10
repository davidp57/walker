/** Relative, glanceable rendering of a task due date, shared by the list and the kanban (BIZ-062). */

export interface DueInfo {
  /** Terse relative label: "Today", "Tomorrow", "Yesterday", "in 3d", "3d overdue". */
  label: string
  /** The due date is strictly before today. */
  overdue: boolean
  /** The due date is exactly today. */
  dueToday: boolean
}

/** Whole days since the UTC epoch for an ISO `YYYY-MM-DD` — avoids DST/timezone drift. */
function toEpochDays(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000)
}

/**
 * Describe `dueDate` relative to `today` (both ISO `YYYY-MM-DD`). Positive diff is future, negative
 * is past. Callers apply the terminal-state exclusion (a done task is never overdue — ADR-0011).
 */
export function describeDue(dueDate: string, today: string): DueInfo {
  const diff = toEpochDays(dueDate) - toEpochDays(today)
  let label: string
  if (diff === 0) label = 'Today'
  else if (diff === 1) label = 'Tomorrow'
  else if (diff === -1) label = 'Yesterday'
  else if (diff > 0) label = `in ${diff}d`
  else label = `${-diff}d overdue`
  return { label, overdue: diff < 0, dueToday: diff === 0 }
}
