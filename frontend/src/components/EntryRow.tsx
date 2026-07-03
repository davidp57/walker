import { useState, type KeyboardEvent } from 'react'
import type { Entry, TimesheetCode } from '../types'
import {
  formatClock,
  formatDuration,
  parseDuration,
  parseMilitaryClock,
  selectOnFocus,
} from '../lib/time'

interface EntryRowProps {
  entry: Entry
  code: TimesheetCode | null
  onEdit: (patch: Partial<Entry>) => void // commit an edited field
  onCategorize: () => void // open Code picker for this Entry
  onOpenEditor: () => void // open the full editor (date, times, duration)
  onResume: () => void
  onDelete: () => void
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
}: EntryRowProps) {
  const [editing, setEditing] = useState<Field | null>(null)
  const [buffer, setBuffer] = useState('')
  const flagged = !entry.codeId
  const duration = Math.max(0, (entry.end ?? entry.start) - entry.start)

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
        if (editing === 'start') onEdit({ start: m, end: Math.max(m, entry.end ?? m) })
        else onEdit({ end: Math.max(entry.start, m) })
      }
    }
    setEditing(null)
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') setEditing(null)
  }

  return (
    <div className={`wk-entry-row${flagged ? ' is-flagged' : ''}`}>
      <span
        className="wk-dot"
        style={{ background: flagged ? 'var(--wk-amber)' : (code?.color ?? 'var(--wk-text-lo)') }}
      />

      {/* time range (military inline edit) */}
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
        {editing === 'end' ? (
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
        {editing === 'dur' ? (
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
          <span
            className="wk-time-span"
            onClick={() => begin('dur')}
            title="Edit duration (keeps the start time)"
          >
            {formatDuration(duration)}
          </span>
        )}
      </div>

      {/* project · code · activity — or the uncategorized flag */}
      <div style={{ minWidth: 0 }}>
        {flagged ? (
          <span className="wk-pill-add" onClick={onCategorize}>
            ⚑ Add code &amp; activity
          </span>
        ) : (
          <div className="wk-code-cell" onClick={onCategorize}>
            <div className="wk-code-name-row">
              <span className="wk-dot" style={{ background: code?.color }} />
              <span className="wk-code-name">{code?.name}</span>
            </div>
            <div className="wk-code-meta">
              {code?.number}
              {entry.activity && entry.activity !== code?.name ? ` · ${entry.activity}` : ''}
            </div>
          </div>
        )}
      </div>

      {/* description (inline edit) */}
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
        ) : (
          <div
            className={`wk-desc${entry.description ? '' : ' is-empty'}`}
            onClick={() => begin('desc')}
          >
            {entry.description || 'Add a description…'}
          </div>
        )}
      </div>

      <button
        type="button"
        className="wk-resume"
        title="Edit entry (date, times, duration)"
        onClick={onOpenEditor}
      >
        ✎
      </button>
      <button type="button" className="wk-resume" title="Resume this task" onClick={onResume}>
        ▶
      </button>
      <button type="button" className="wk-delete" title="Delete entry" onClick={onDelete}>
        ✕
      </button>
    </div>
  )
}
