import type { PeriodRow, TimesheetCode } from '../types'

// T&E type block order (BIZ-068): C(hargeable) < N(on-chargeable) < A(bsence) < unknown/missing.
const TYPE_RANK: Record<string, number> = { C: 0, N: 1, A: 2 }
const typeRank = (type: string | null | undefined): number =>
  type ? (TYPE_RANK[type.toUpperCase()[0]] ?? 3) : 3

// Raw (case-sensitive, no locale/accent normalization) string compare, matching T&E's native JS
// `>`/`==` on strings (see the reverse-engineered `SortAssignment`). NOT `localeCompare`.
const rawCompare = (a: string, b: string): number => (a === b ? 0 : a > b ? 1 : -1)

/**
 * Order two resolved Enter-in-Timesheet-system rows to match the PwC T&E weekly grid (BIZ-068):
 * block by type (C<N<A), then — reproducing T&E's `SortAssignment` — by `customer` (only when both
 * are known), then by the code label (`Text`), then by the activity label as a tie-break. All string
 * comparisons are case-sensitive with no locale normalization, exactly like T&E.
 */
export function compareTimesheetOrder(a: PeriodRow, b: PeriodRow): number {
  const rankDelta = typeRank(a.code.type) - typeRank(b.code.type)
  if (rankDelta !== 0) return rankDelta
  let result = 0
  if (a.code.customer != null && b.code.customer != null) {
    result = rawCompare(a.code.customer, b.code.customer)
  }
  if (result === 0) result = rawCompare(a.code.label, b.code.label)
  if (result === 0) result = rawCompare(a.activity, b.activity)
  return result
}

/**
 * Resolve the Timesheet period/Review rows into the Enter-in-Timesheet-system rows (ADR-0008).
 *
 * Virtual codes collapse into the real code they borrow their number/label/activities from — a
 * `codeId → TimesheetCode` map is used to find each row's real code. Several rows that resolve to
 * the same `(real code, activity)` are merged, summing minutes per day exactly (no rounding,
 * ADR-0005). Rows for a real code with no virtual pass through unchanged.
 *
 * The merged rows are ordered to match the T&E grid (BIZ-068) so the user keys Walker's checklist
 * and the T&E weekly grid in the same order.
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
  return Array.from(merged.values()).sort(compareTimesheetOrder)
}
