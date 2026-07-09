/** Detect time overlaps between a day's entries and, for the safe (staggered) case, a trim (BIZ-052). */

export interface EntryInterval {
  id: string
  start: number // minutes since midnight
  end: number | null // null = the running timer (excluded from detection)
}

export interface OverlapInfo {
  /** Other completed entries whose time range this one intersects (any classification). */
  partners: { id: string; start: number; end: number }[]
  /**
   * When this entry is the *earlier* side of a fixable (staggered) overlap — distinct starts and it
   * doesn't nest the other — the end it should be trimmed to (the later entry's start). `null` for a
   * nested or same-start overlap, where an automatic trim would delete or zero real tracked time.
   */
  fixEnd: number | null
}

/**
 * Map each completed entry to its overlap info. Two entries overlap when their `[start, end)`
 * intervals strictly intersect; merely touching (`aEnd === bStart`) is not an overlap. The running
 * entry (`end === null`) is excluded. Pure — no DOM/clock access.
 */
export function detectOverlaps(entries: EntryInterval[]): Record<string, OverlapInfo> {
  const done = entries.filter((e): e is { id: string; start: number; end: number } => e.end != null)
  const info: Record<string, OverlapInfo> = {}
  for (const e of done) info[e.id] = { partners: [], fixEnd: null }

  for (let i = 0; i < done.length; i++) {
    for (let j = i + 1; j < done.length; j++) {
      const [a, b] = done[i].start <= done[j].start ? [done[i], done[j]] : [done[j], done[i]]
      // `a` starts no later than `b`; with that, strict intersection reduces to `b.start < a.end`.
      if (b.start < a.end) {
        info[a.id].partners.push({ id: b.id, start: b.start, end: b.end })
        info[b.id].partners.push({ id: a.id, start: a.start, end: a.end })
        // Fixable (staggered): distinct starts and `a` doesn't nest `b`. Trim `a.end` to `b.start`.
        if (a.start < b.start && a.end <= b.end) {
          const cur = info[a.id].fixEnd
          info[a.id].fixEnd = cur == null ? b.start : Math.min(cur, b.start)
        }
      }
    }
  }
  return info
}
