/** Detect time overlaps between a day's entries and, for the safe (staggered) case, a trim (BIZ-052). */

export interface EntryInterval {
  id: string
  start: number // minutes since midnight
  end: number | null // null = the running timer — an open (live) end, still detected against (BIZ-072)
}

export interface OverlapInfo {
  /** Other entries whose time range this one intersects; `end: null` names the running timer (BIZ-072). */
  partners: { id: string; start: number; end: number | null }[]
  /**
   * When this entry is the *earlier* side of a fixable (staggered) overlap — distinct starts and it
   * doesn't nest the other — the end it should be trimmed to (the later entry's start). `null` for a
   * nested or same-start overlap, where an automatic trim would delete or zero real tracked time.
   */
  fixEnd: number | null
}

/**
 * Map each entry to its overlap info. Two entries overlap when their `[start, end)` intervals
 * strictly intersect; merely touching (`aEnd === bStart`) is not an overlap. The running entry
 * (`end === null`) participates using its start with an open (`+∞`) end (BIZ-072): a completed entry
 * crossing the timer's start is flagged, and — only when it starts *before* the timer — offered a
 * trim to the timer's start. The running entry is never itself assigned a trim (its live end is
 * unknown; it stays read-only, BIZ-038). Pure — no DOM/clock access.
 */
export function detectOverlaps(entries: EntryInterval[]): Record<string, OverlapInfo> {
  // Keep the original (possibly-null) end for display; use an open +∞ end for the interval math so
  // the running timer is detected against without a known end.
  const OPEN = Number.POSITIVE_INFINITY
  const norm = entries.map((e) => ({ ...e, calcEnd: e.end ?? OPEN }))
  const info: Record<string, OverlapInfo> = {}
  for (const e of norm) info[e.id] = { partners: [], fixEnd: null }

  for (let i = 0; i < norm.length; i++) {
    for (let j = i + 1; j < norm.length; j++) {
      const [a, b] = norm[i].start <= norm[j].start ? [norm[i], norm[j]] : [norm[j], norm[i]]
      // `a` starts no later than `b`; with that, strict intersection reduces to `b.start < a.calcEnd`.
      if (b.start < a.calcEnd) {
        info[a.id].partners.push({ id: b.id, start: b.start, end: b.end })
        info[b.id].partners.push({ id: a.id, start: a.start, end: a.end })
        // Fixable (staggered): distinct starts and `a` doesn't nest `b`. Trim `a.end` to `b.start`.
        // An open-ended running `a` (calcEnd = +∞) never satisfies `a.calcEnd <= b.calcEnd`, so it is
        // never assigned a trim.
        if (a.start < b.start && a.calcEnd <= b.calcEnd) {
          const cur = info[a.id].fixEnd
          info[a.id].fixEnd = cur == null ? b.start : Math.min(cur, b.start)
        }
      }
    }
  }
  return info
}
