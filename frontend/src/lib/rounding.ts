/** Quarter-hour rounding for the Enter view (BIZ-063, ADR-0013). Display-only; never persisted. */

const QUARTER = 15

/**
 * Round a day column's cell durations (minutes) to quarter-hours with **error-carry**: walking the
 * values in order, keep a running signed error `Σrounded − Σreal` and round each value to the
 * quarter (down or up) that brings that error closest to zero. The rounded total therefore equals
 * the real total rounded to the nearest quarter-hour, and per-cell drift stays under 15 minutes.
 *
 * Example: five 6-minute cells (real total 30) → `[0, 15, 0, 15, 0]` (total 30), where naive
 * nearest-quarter rounding would give all zeros.
 */
export function roundQuarterHourCarry(values: number[]): number[] {
  let error = 0 // Σrounded − Σreal so far
  return values.map((value) => {
    const floor = Math.floor(value / QUARTER) * QUARTER
    const ceil = value % QUARTER === 0 ? floor : floor + QUARTER
    // Pick the neighbour that pulls the accumulated error closest to zero (ties → round down).
    const rounded = Math.abs(error + floor - value) <= Math.abs(error + ceil - value) ? floor : ceil
    error += rounded - value
    return rounded
  })
}
