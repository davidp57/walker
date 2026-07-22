import { useState, type KeyboardEvent } from 'react'
import type { Entry, TimesheetCode } from '../types'
import type { OverlapInfo } from '../lib/overlaps'
import {
  formatClock,
  formatDuration,
  parseDuration,
  parseMilitaryClock,
  selectOnFocus,
} from '../lib/time'
import { IconBreak, IconEdit, IconPlay, IconTrash } from './icons'

interface EntryRowProps {
  entry: Entry
  code: TimesheetCode | null
  onEdit: (patch: Partial<Entry>) => void // commit an edited field
  onCategorize: () => void // open Code picker for this Entry
  onOpenEditor: () => void // open the full editor (date, times, duration)
  onResume: () => void
  onDelete: () => void
  onInsertBreak?: () => void // BIZ-076: punch a hole (e.g. lunch) in this entry; omit to hide the action
  // BIZ-077: the id of an entry this row can merge with (same code+activity, overlapping or the
  // directly-following running timer), or null when none. `onMerge` performs it.
  mergeTargetId?: string | null
  onMerge?: (targetId: string) => void
  // BIZ-038: this row is the live running Timer — read-only, live duration, no inline controls.
  running?: boolean
  liveMinutes?: number // live elapsed minutes, used when `running`
  // BIZ-042: longest entry duration in this day group, for the proportion bar (omit to hide it).
  maxMinutes?: number
  // BIZ-052: this entry's time-overlap info within its day (omit when it overlaps nothing).
  overlap?: OverlapInfo
}

type Field = 'start' | 'end' | 'dur' | 'desc'

export function EntryRow({
  entry,
  code,
  onEdit,
  onCategorize,
  onOpenEditor,
  onResume,
  onDelete,
  onInsertBreak,
  mergeTargetId,
  onMerge,
  running = false,
  liveMinutes,
  maxMinutes,
  overlap,
}: EntryRowProps) {
  const overlapPartner = overlap?.partners[0]
  const overlapFixEnd = overlap?.fixEnd ?? null
  const [editing, setEditing] = useState<Field | null>(null)
  const [buffer, setBuffer] = useState('')
  const [rowHover, setRowHover] = useState(false)
  const [descFocus, setDescFocus] = useState(false)
  const flagged = !entry.codeId
  const duration = running
    ? Math.max(0, liveMinutes ?? 0)
    : Math.max(0, (entry.end ?? entry.start) - entry.start)
  const barColor = flagged ? 'var(--wk-amber)' : (code?.color ?? 'var(--wk-text-lo)')
  // BIZ-042: proportion of the day group's longest entry (only when a scale is provided).
  const barPct =
    maxMinutes && maxMinutes > 0 ? Math.min(100, Math.round((duration / maxMinutes) * 100)) : 0

  const begin = (field: Field) => {
    setEditing(field)
    if (field === 'desc') setBuffer(entry.description)
    else if (field === 'dur') setBuffer(formatDuration(duration))
    else setBuffer(formatClock(field === 'start' ? entry.start : (entry.end ?? entry.start)))
  }
  const commit = () => {
    if (!editing) return
    if (editing === 'desc') {
      onEdit({ description: buffer })
    } else if (editing === 'dur') {
      // Keep the start; the new end is start + duration (real minutes, no rounding).
      onEdit({ end: entry.start + parseDuration(buffer) })
    } else {
      const m = parseMilitaryClock(buffer)
      if (m != null) {
        if (editing === 'start') {
          // While running the entry has no end yet — patch only the start; adding an end would
          // stop the live timer (BIZ-054). Otherwise keep the end at or after the new start.
          onEdit(running ? { start: m } : { start: m, end: Math.max(m, entry.end ?? m) })
        } else {
          onEdit({ end: Math.max(entry.start, m) })
        }
      }
    }
    setEditing(null)
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') setEditing(null)
  }

  const bar =
    maxMinutes !== undefined ? (
      <div className="wk-dur-bar" aria-hidden="true">
        <div className="wk-dur-bar-fill" style={{ width: `${barPct}%`, background: barColor }} />
      </div>
    ) : null

  const className = [
    'wk-entry-row',
    flagged ? 'is-flagged' : '',
    running ? 'is-running' : '',
    overlapPartner ? 'is-overlap' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={className}
      onMouseEnter={() => setRowHover(true)}
      onMouseLeave={() => setRowHover(false)}
    >
      <span className="wk-dot" style={{ background: barColor }} />

      {/* Start is editable in both modes; while running the end shows live "now" and stays
          read-only (edit end/duration by stopping the Timer) — BIZ-054. */}
      <div className="wk-time">
        {editing === 'start' ? (
          <input
            className="wk-input-inline"
            autoFocus
            value={buffer}
            onFocus={selectOnFocus}
            onChange={(e) => setBuffer(e.target.value)}
            onKeyDown={onKey}
            onBlur={commit}
          />
        ) : (
          <span className="wk-time-span" onClick={() => begin('start')}>
            {formatClock(entry.start)}
          </span>
        )}
        <span className="wk-time-sep">–</span>
        {running ? (
          <span className="wk-time-span wk-time-now">
            now
            <span className="wk-cell-live" />
          </span>
        ) : editing === 'end' ? (
          <input
            className="wk-input-inline"
            autoFocus
            value={buffer}
            onFocus={selectOnFocus}
            onChange={(e) => setBuffer(e.target.value)}
            onKeyDown={onKey}
            onBlur={commit}
          />
        ) : (
          <span className="wk-time-span" onClick={() => begin('end')}>
            {formatClock(entry.end ?? entry.start)}
          </span>
        )}
      </div>

      <div className="wk-dur">
        {running || editing !== 'dur' ? (
          <span
            className="wk-time-span"
            onClick={running ? undefined : () => begin('dur')}
            title={running ? undefined : 'Edit duration (keeps the start time)'}
          >
            {formatDuration(duration)}
          </span>
        ) : (
          <input
            className="wk-input-inline"
            autoFocus
            value={buffer}
            onFocus={selectOnFocus}
            onChange={(e) => setBuffer(e.target.value)}
            onKeyDown={onKey}
            onBlur={commit}
          />
        )}
        {bar}
      </div>

      {/* project · code · activity — or the uncategorized flag (categorizable even while running,
          BIZ-054) */}
      <div style={{ minWidth: 0 }}>
        {flagged ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span className="wk-pill-add" onClick={onCategorize}>
              ⚑ Add code &amp; activity
            </span>
            {entry.source === 'manual' && (
              <span className="wk-manual-mark" title="Added manually">
                ✎
              </span>
            )}
          </span>
        ) : (
          <div className="wk-code-cell" onClick={onCategorize}>
            <div className="wk-code-name-row">
              <span className="wk-dot" style={{ background: code?.color }} />
              <span className="wk-code-name">{code?.name}</span>
              {entry.source === 'manual' && (
                <span className="wk-manual-mark" title="Added manually">
                  ✎
                </span>
              )}
            </div>
            <div className="wk-code-meta">
              {code?.number}
              {entry.activity ? (
                entry.activity !== code?.name ? (
                  ` · ${entry.activity}`
                ) : (
                  ''
                )
              ) : (
                // BIZ-070: coded but no activity → won't reach the matrix; flag it (click categorizes).
                <span
                  className="wk-needs-activity"
                  title="Pick an activity so this reaches the matrix"
                >
                  {' · ⚑ pick an activity'}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* description (inline edit — editable while running too, BIZ-054; the empty invite reveals
          on hover/focus — BIZ-040) */}
      <div style={{ minWidth: 0 }}>
        {editing === 'desc' ? (
          <input
            className="wk-desc-edit"
            autoFocus
            value={buffer}
            onFocus={selectOnFocus}
            onChange={(e) => setBuffer(e.target.value)}
            onKeyDown={onKey}
            onBlur={commit}
          />
        ) : entry.description ? (
          <div className="wk-desc" onClick={() => begin('desc')}>
            {entry.description}
          </div>
        ) : (
          <div
            className="wk-desc is-empty"
            tabIndex={0}
            onClick={() => begin('desc')}
            onFocus={() => setDescFocus(true)}
            onBlur={() => setDescFocus(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') begin('desc')
            }}
          >
            {rowHover || descFocus ? 'Add a description…' : '—'}
          </div>
        )}
      </div>

      {running ? (
        <>
          <span />
          <span />
          <span />
          <span />
        </>
      ) : (
        <>
          <button
            type="button"
            className="wk-row-action"
            title="Edit entry (date, times, duration)"
            aria-label="Edit entry"
            onClick={onOpenEditor}
          >
            <IconEdit />
          </button>
          {onInsertBreak ? (
            <button
              type="button"
              className="wk-row-action"
              title="Insert a break (carve out lunch etc.)"
              aria-label="Insert a break"
              onClick={onInsertBreak}
            >
              <IconBreak />
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            className="wk-row-action"
            title="Resume this entry"
            aria-label="Resume this entry"
            onClick={onResume}
          >
            <IconPlay size={12} />
          </button>
          <button
            type="button"
            className="wk-row-action wk-row-action-danger"
            title="Delete entry"
            aria-label="Delete entry"
            onClick={onDelete}
          >
            <IconTrash />
          </button>
        </>
      )}

      {/* BIZ-052: time-overlap note (full-width line). BIZ-077 adds a Merge action here — and the note
          also shows for a merge-only case (a same-code timer directly following, no overlap badge). */}
      {(overlapPartner || (mergeTargetId && onMerge)) && (
        <div className="wk-overlap-note">
          {overlapPartner && (
            <span className="wk-overlap-badge">
              {overlapPartner.end == null
                ? `⚠ overlaps running timer (since ${formatClock(overlapPartner.start)})`
                : `⚠ overlaps ${formatClock(overlapPartner.start)}–${formatClock(overlapPartner.end)}`}
              {overlap && overlap.partners.length > 1 ? ` +${overlap.partners.length - 1}` : ''}
            </span>
          )}
          {overlapFixEnd != null && (
            <button
              type="button"
              className="wk-overlap-fix"
              title={`Shorten this entry's end to ${formatClock(overlapFixEnd)} (start of the next entry)`}
              onClick={() => onEdit({ end: overlapFixEnd })}
            >
              Trim to {formatClock(overlapFixEnd)}
            </button>
          )}
          {mergeTargetId && onMerge && (
            <button
              type="button"
              className="wk-overlap-fix"
              title="Merge these two same-code entries into one"
              onClick={() => onMerge(mergeTargetId)}
            >
              Merge
            </button>
          )}
        </div>
      )}
    </div>
  )
}
