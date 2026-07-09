import type { Entry, TimesheetCode } from '../types'
import { EntryRow } from '../components/EntryRow'
import { detectOverlaps } from '../lib/overlaps'

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
  onLoadEarlier: () => void
  onAddEntry: () => void
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
  onLoadEarlier,
  onAddEntry,
}: TrackerScreenProps) {
  const durationOf = (e: Entry): number =>
    e.id === runningId ? runningMinutes : Math.max(0, (e.end ?? e.start) - e.start)
  return (
    <div className="wk-screen wk-entry-cols" style={{ maxWidth: 1120 }}>
      <div className="wk-screen-head">
        <div>
          <div className="wk-screen-title">Activity</div>
          <div className="wk-screen-sub">
            Your tracked time, most recent first · to the minute · no rounding
          </div>
        </div>
        <button
          type="button"
          className="wk-btn wk-btn-primary"
          style={{ padding: '8px 16px' }}
          onClick={onAddEntry}
        >
          + Add entry
        </button>
      </div>

      {loading ? (
        <div className="wk-loading">Loading…</div>
      ) : groups.length === 0 ? (
        <div className="wk-empty">
          <div className="wk-empty-title">Adios, backlog.</div>
          <div className="wk-empty-sub">
            Nothing tracked yet. Hit <span className="wk-accent">Start</span> — categorize it later.
          </div>
        </div>
      ) : (
        <>
          {groups.map((group) => (
            <div key={group.date} style={{ marginBottom: 20 }}>
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
                <div className="wk-screen-sub">Total: {group.totalLabel}</div>
              </div>
              <div className="wk-entry-head">
                <div />
                <div>Time</div>
                <div>Dur</div>
                <div>Project · code · activity</div>
                <div>Description</div>
                <div />
                <div />
                <div />
              </div>
              <div className="wk-entry-list">
                {(() => {
                  const groupMax = Math.max(1, ...group.entries.map(durationOf))
                  // BIZ-052: detect time overlaps within the day, excluding the live running entry.
                  const overlaps = detectOverlaps(
                    group.entries
                      .filter((e) => e.id !== runningId)
                      .map((e) => ({ id: e.id, start: e.start, end: e.end ?? null })),
                  )
                  return group.entries.map((entry) => (
                    <EntryRow
                      key={entry.id}
                      entry={entry}
                      code={entry.codeId ? (codesById[entry.codeId] ?? null) : null}
                      running={entry.id === runningId}
                      liveMinutes={runningMinutes}
                      maxMinutes={groupMax}
                      overlap={entry.id === runningId ? undefined : overlaps[entry.id]}
                      onEdit={(patch) => onEditEntry(entry.id, patch)}
                      onCategorize={() => onCategorizeEntry(entry.id)}
                      onOpenEditor={() => onOpenEntry(entry.id)}
                      onResume={() => onResumeEntry(entry.id)}
                      onDelete={() => onDeleteEntry(entry.id)}
                    />
                  ))
                })()}
              </div>
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
