import type { FortnightRow, TimesheetCode } from '../types'

/**
 * Resolve the Fortnight/Review rows into the Enter-in-T&E rows (ADR-0008).
 *
 * Virtual codes collapse into the real code they borrow their number/label/activities from — a
 * `codeId → TimesheetCode` map is used to find each row's real code. Several rows that resolve to
 * the same `(real code, activity)` are merged, summing minutes per day exactly (no rounding,
 * ADR-0005). Rows for a real code with no virtual pass through unchanged.
 */
export function resolveChecklistRows(
  rows: FortnightRow[],
  codesById: Record<string, TimesheetCode>,
): FortnightRow[] {
  const merged = new Map<string, FortnightRow>()
  rows.forEach((row) => {
    const realCode = row.code.realCodeId ? (codesById[row.code.realCodeId] ?? row.code) : row.code
    const key = `${realCode.id}|${row.activity}`
    const existing = merged.get(key)
    if (!existing) {
      merged.set(key, {
        key,
        code: realCode,
        activity: row.activity,
        minutesByDay: { ...row.minutesByDay },
      })
      return
    }
    const minutesByDay = { ...existing.minutesByDay }
    for (const [day, minutes] of Object.entries(row.minutesByDay)) {
      minutesByDay[Number(day)] = (minutesByDay[Number(day)] || 0) + minutes
    }
    merged.set(key, { ...existing, minutesByDay })
  })
  return Array.from(merged.values())
}
