import { useState, type KeyboardEvent } from 'react'
import type { Entry, TimesheetCode } from '../types'
import {
  formatClock,
  formatDuration,
  parseDuration,
  parseMilitaryClock,
  selectOnFocus,
} from '../lib/time'
import { IconEdit, IconPlay, IconTrash } from './icons'

interface EntryRowProps {
  entry: Entry
  code: TimesheetCode | null
  onEdit: (patch: Partial<Entry>) => void // commit an edited field
  onCategorize: () => void // open Code picker for this Entry
  onOpenEditor: () => void // open the full editor (date, times, duration)
  onResume: () => void
  onDelete: () => void
  // BIZ-038: this row is the live running Timer — read-only, live duration, no inline controls.
  running?: boolean
  liveMinutes?: number // live elapsed minutes, used when `running`
  // BIZ-042: longest entry duration in this day group, for the proportion bar (omit to hide it).
  maxMinutes?: number
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
  running = false,
  liveMinutes,
  maxMinutes,
}: EntryRowProps) {
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

  const bar =
    maxMinutes !== undefined ? (
      <div className="wk-dur-bar" aria-hidden="true">
        <div className="wk-dur-bar-fill" style={{ width: `${barPct}%`, background: barColor }} />
      </div>
    ) : null

  const className = ['wk-entry-row', flagged ? 'is-flagged' : '', running ? 'is-running' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={className}
      onMouseEnter={() => setRowHover(true)}
      onMouseLeave={() => setRowHover(false)}
    >
      <span className="wk-dot" style={{ background: barColor }} />

      {/* time range — read-only while running (stop the Timer from the bar to edit) */}
      <div className="wk-time">
        {running ? (
          <>
            <span className="wk-time-span">{formatClock(entry.start)}</span>
            <span className="wk-time-sep">–</span>
            <span className="wk-time-span wk-time-now">
              now
              <span className="wk-cell-live" />
            </span>
          </>
        ) : (
          <>
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
          </>
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

      {/* project · code · activity — or the uncategorized flag */}
      <div style={{ minWidth: 0 }}>
        {flagged ? (
          running ? (
            <span className="wk-pill-add is-static">⚑ Uncategorized</span>
          ) : (
            <span className="wk-pill-add" onClick={onCategorize}>
              ⚑ Add code &amp; activity
            </span>
          )
        ) : (
          <div className="wk-code-cell" onClick={running ? undefined : onCategorize}>
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

      {/* description (inline edit; the empty invite reveals on hover/focus — BIZ-040) */}
      <div style={{ minWidth: 0 }}>
        {running ? (
          <div className="wk-desc">{entry.description}</div>
        ) : editing === 'desc' ? (
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
          <button
            type="button"
            className="wk-row-action"
            title="Resume this task"
            aria-label="Resume this task"
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
    </div>
  )
}
