import { useState, type ReactNode } from 'react'
import type { Entry, TimesheetCode } from '../types'
import { EntryRow } from '../components/EntryRow'
import { detectOverlaps } from '../lib/overlaps'
import { formatDuration } from '../lib/time'

/** One day's worth of entries, as shown in the tracker's grouped list. */
export interface DayGroup {
  date: string // ISO "YYYY-MM-DD"
  label: string // "Today", "Yesterday", or "Fri, Jul 3"
  totalLabel: string // day total "H:MM"
  entries: Entry[] // completed entries for the day, sorted by start
}

interface TrackerScreenProps {
  groups: DayGroup[]
  codesById: Record<string, TimesheetCode>
  /** True until the first entries response has arrived — avoids flashing the empty state. */
  loading?: boolean
  /** The live running entry's id + elapsed minutes, shown as a read-only live row (BIZ-038). */
  runningId?: string | null
  runningMinutes?: number
  onEditEntry: (id: string, patch: Partial<Entry>) => void
  onCategorizeEntry: (id: string) => void
  onOpenEntry: (id: string) => void
  onResumeEntry: (id: string) => void
  onDeleteEntry: (id: string) => void
  onInsertBreak?: (id: string) => void // BIZ-076: punch a hole (lunch break) in this entry
  onMergeEntries?: (id: string, otherId: string) => void // BIZ-077: merge two overlapping/adjacent entries
  onLoadEarlier: () => void
  // BIZ-064: add a manual entry with its date prefilled to `date` (a day group's date).
  onAddEntry: (date: string) => void
  today: string // ISO "YYYY-MM-DD" — the Today group is always shown, and its Add is primary.
}

export function TrackerScreen({
  groups,
  codesById,
  loading = false,
  runningId = null,
  runningMinutes = 0,
  onEditEntry,
  onCategorizeEntry,
  onOpenEntry,
  onResumeEntry,
  onDeleteEntry,
  onInsertBreak,
  onMergeEntries,
  onLoadEarlier,
  onAddEntry,
  today,
}: TrackerScreenProps) {
  // BIZ-079: the [upper, lower] ids of the merge pair whose seam pill is hovered — both rows tint.
  const [hoverPair, setHoverPair] = useState<[string, string] | null>(null)
  const durationOf = (e: Entry): number =>
    e.id === runningId ? runningMinutes : Math.max(0, (e.end ?? e.start) - e.start)

  // BIZ-064: always show a Today group so its (primary) Add is available even on a day with nothing
  // tracked yet. Groups arrive most-recent-first, so a synthesized Today slots in at the top.
  const displayGroups: DayGroup[] = groups.some((g) => g.date === today)
    ? groups
    : [{ date: today, label: 'Today', totalLabel: formatDuration(0), entries: [] }, ...groups]

  const dayAdd = (group: DayGroup) => (
    <button
      type="button"
      className={`wk-daygroup-add${group.date === today ? ' is-today' : ' is-quiet'}`}
      data-testid={`wk-add-day-${group.date}`}
      title={`Add an entry on ${group.label}`}
      onClick={() => onAddEntry(group.date)}
    >
      + Add
    </button>
  )
  return (
    <div className="wk-screen wk-entry-cols" style={{ maxWidth: 1120 }}>
      <div className="wk-screen-head">
        <div>
          <div className="wk-screen-title">Activity</div>
          <div className="wk-screen-sub">
            Your tracked time, most recent first · to the minute · no rounding
          </div>
        </div>
      </div>

      {loading ? (
        <div className="wk-loading">Loading…</div>
      ) : groups.length === 0 ? (
        <div className="wk-empty">
          <div className="wk-empty-title">Adios, backlog.</div>
          <div className="wk-empty-sub">
            Nothing tracked yet. Hit <span className="wk-accent">Start</span> — categorize it later.
          </div>
          <button
            type="button"
            className="wk-btn wk-btn-primary"
            style={{ marginTop: 14, padding: '8px 16px' }}
            onClick={() => onAddEntry(today)}
          >
            + Add entry
          </button>
        </div>
      ) : (
        <>
          {displayGroups.map((group) => (
            <div key={group.date} className="wk-daygroup" style={{ marginBottom: 20 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  margin: '10px 0 6px',
                }}
              >
                <div className="wk-screen-title" style={{ fontSize: 15 }}>
                  {group.label}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {group.entries.length > 0 && (
                    <div className="wk-screen-sub">Total: {group.totalLabel}</div>
                  )}
                  {dayAdd(group)}
                </div>
              </div>
              {group.entries.length === 0 ? null : (
                <>
                  <div className="wk-entry-head">
                    <div />
                    <div>Time</div>
                    <div>Dur</div>
                    <div>Project · code · activity</div>
                    <div>Description</div>
                    <div />
                    <div />
                    <div />
                    <div />
                  </div>
                  <div className="wk-entry-list">
                    {(() => {
                      const groupMax = Math.max(1, ...group.entries.map(durationOf))
                      // BIZ-052/BIZ-072: detect time overlaps within the day, including the live
                      // running entry (its null end is treated as an open interval by detectOverlaps).
                      const overlaps = detectOverlaps(
                        group.entries.map((e) => ({
                          id: e.id,
                          start: e.start,
                          end: e.end ?? null,
                        })),
                      )
                      // BIZ-079: two DOM-consecutive rows are a mergeable pair when they share code +
                      // activity and touch/overlap in time. The list is newest-first (BIZ-019), so the
                      // upper row is the later entry and the lower is the earlier; the earlier's end
                      // meeting or crossing the later's start means no gap. The upper row may be the
                      // running timer (it survives the merge — BIZ-077).
                      const mergeable = (upper: Entry, lower: Entry): boolean =>
                        upper.codeId === lower.codeId &&
                        upper.activity === lower.activity &&
                        lower.end != null &&
                        lower.end >= upper.start
                      const items: ReactNode[] = []
                      group.entries.forEach((entry, i) => {
                        items.push(
                          <EntryRow
                            key={entry.id}
                            entry={entry}
                            code={entry.codeId ? (codesById[entry.codeId] ?? null) : null}
                            running={entry.id === runningId}
                            liveMinutes={runningMinutes}
                            maxMinutes={groupMax}
                            overlap={entry.id === runningId ? undefined : overlaps[entry.id]}
                            mergeHighlight={hoverPair?.includes(entry.id) ?? false}
                            onEdit={(patch) => onEditEntry(entry.id, patch)}
                            onCategorize={() => onCategorizeEntry(entry.id)}
                            onOpenEditor={() => onOpenEntry(entry.id)}
                            onResume={() => onResumeEntry(entry.id)}
                            onDelete={() => onDeleteEntry(entry.id)}
                            onInsertBreak={
                              onInsertBreak ? () => onInsertBreak(entry.id) : undefined
                            }
                          />,
                        )
                        const lower = group.entries[i + 1]
                        if (onMergeEntries && lower && mergeable(entry, lower)) {
                          items.push(
                            <MergeSeam
                              key={`seam-${entry.id}-${lower.id}`}
                              onMerge={() => onMergeEntries(entry.id, lower.id)}
                              onHover={(h) => setHoverPair(h ? [entry.id, lower.id] : null)}
                            />,
                          )
                        }
                      })
                      return items
                    })()}
                  </div>
                </>
              )}
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
            <button type="button" className="wk-btn-ghost" onClick={onLoadEarlier}>
              ◀ Load earlier days
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * BIZ-079: the Merge affordance — a compact pill on the seam between two mergeable rows. Its position
 * on the shared border identifies the pair; hovering it tints both rows via `onHover`.
 */
function MergeSeam({
  onMerge,
  onHover,
}: {
  onMerge: () => void
  onHover: (hovering: boolean) => void
}) {
  return (
    <div className="wk-merge-seam">
      {/* BIZ-079: at rest a compact circular node on the seam; on hover/focus it widens and reveals
          the "Merge" label (progressive disclosure), so the affordance stays quiet until wanted. */}
      <button
        type="button"
        className="wk-merge-pill"
        title="Merge these two entries into one"
        aria-label="Merge these two entries"
        onClick={onMerge}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        onFocus={() => onHover(true)}
        onBlur={() => onHover(false)}
      >
        <span className="wk-merge-pill__glyph" aria-hidden="true">
          ⇕
        </span>
        <span className="wk-merge-pill__label">Merge</span>
      </button>
    </div>
  )
}
