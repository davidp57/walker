import type { PeriodRow, TimesheetCode } from '../types'

/**
 * Resolve the Timesheet period/Review rows into the Enter-in-Timesheet-system rows (ADR-0008).
 *
 * Virtual codes collapse into the real code they borrow their number/label/activities from — a
 * `codeId → TimesheetCode` map is used to find each row's real code. Several rows that resolve to
 * the same `(real code, activity)` are merged, summing minutes per day exactly (no rounding,
 * ADR-0005). Rows for a real code with no virtual pass through unchanged.
 */
export function resolveChecklistRows(
  rows: PeriodRow[],
  codesById: Record<string, TimesheetCode>,
): PeriodRow[] {
  const merged = new Map<string, PeriodRow>()
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
        manualByDay: { ...(row.manualByDay ?? {}) },
      })
      return
    }
    const minutesByDay = { ...existing.minutesByDay }
    for (const [day, minutes] of Object.entries(row.minutesByDay)) {
      minutesByDay[Number(day)] = (minutesByDay[Number(day)] || 0) + minutes
    }
    // OR-combine the manual flag as virtual rows merge into their real code (BIZ-065).
    const manualByDay = { ...(existing.manualByDay ?? {}) }
    for (const [day, isManual] of Object.entries(row.manualByDay ?? {})) {
      manualByDay[Number(day)] = Boolean(manualByDay[Number(day)]) || isManual
    }
    merged.set(key, { ...existing, minutesByDay, manualByDay })
  })
  return Array.from(merged.values())
}
