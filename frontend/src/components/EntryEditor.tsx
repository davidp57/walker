import { useState } from 'react'
import type { Entry, TimesheetCode } from '../types'
import {
  formatClock,
  formatDuration,
  parseDuration,
  parseMilitaryClock,
  selectOnFocus,
} from '../lib/time'

interface EntryEditorProps {
  entry: Entry
  code: TimesheetCode | null
  onSave: (patch: Partial<Entry>) => void
  onOpenPicker: () => void // reuse CodePicker to change code/activity
  onDelete?: () => void // omit to hide the Delete action
  onClose: () => void
  title?: string // modal heading (e.g. "New entry"); defaults to "Edit entry"
}

/** Modal full editor for one Entry — date, start/end (hh:mm or hhmm), duration, description. */
export function EntryEditor({
  entry,
  code,
  onSave,
  onOpenPicker,
  onDelete,
  onClose,
  title = 'Edit entry',
}: EntryEditorProps) {
  const [date, setDate] = useState(entry.date)
  const [start, setStart] = useState(formatClock(entry.start))
  const [end, setEnd] = useState(formatClock(entry.end ?? entry.start))
  const [duration, setDuration] = useState(
    formatDuration(Math.max(0, (entry.end ?? entry.start) - entry.start)),
  )
  const [description, setDescription] = useState(entry.description)

  // Editing start/end recomputes the duration; editing the duration recomputes the end (start kept).
  const onStartChange = (value: string) => {
    setStart(value)
    const s = parseMilitaryClock(value)
    const e = parseMilitaryClock(end)
    if (s != null && e != null) setDuration(formatDuration(Math.max(0, e - s)))
  }
  const onEndChange = (value: string) => {
    setEnd(value)
    const s = parseMilitaryClock(start)
    const e = parseMilitaryClock(value)
    if (s != null && e != null) setDuration(formatDuration(Math.max(0, e - s)))
  }
  const onDurationChange = (value: string) => {
    setDuration(value)
    const s = parseMilitaryClock(start)
    if (s != null) setEnd(formatClock(s + parseDuration(value)))
  }

  const save = () => {
    const s = parseMilitaryClock(start)
    const e = parseMilitaryClock(end)
    const patch: Partial<Entry> = { description, date }
    if (s != null) patch.start = s
    if (e != null) patch.end = Math.max(s ?? entry.start, e)
    onSave(patch)
    onClose()
  }

  return (
    <div className="wk-overlay" onClick={onClose}>
      <div className="wk-modal" onClick={(ev) => ev.stopPropagation()}>
        <div className="wk-modal-head">
          <span className="wk-modal-title">{title}</span>
          <button type="button" className="wk-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label>
            <div className="wk-screen-sub" style={{ marginBottom: 6 }}>
              Date
            </div>
            <input
              className="wk-input"
              type="date"
              value={date}
              onChange={(ev) => setDate(ev.target.value)}
            />
          </label>

          <div style={{ display: 'flex', gap: 12 }}>
            <label style={{ flex: 1 }}>
              <div className="wk-screen-sub" style={{ marginBottom: 6 }}>
                Start
              </div>
              <input
                className="wk-input"
                value={start}
                onFocus={selectOnFocus}
                onChange={(ev) => onStartChange(ev.target.value)}
                placeholder="0900"
              />
            </label>
            <label style={{ flex: 1 }}>
              <div className="wk-screen-sub" style={{ marginBottom: 6 }}>
                End
              </div>
              <input
                className="wk-input"
                value={end}
                onFocus={selectOnFocus}
                onChange={(ev) => onEndChange(ev.target.value)}
                placeholder="1030"
              />
            </label>
            <label style={{ flex: 1 }}>
              <div className="wk-screen-sub" style={{ marginBottom: 6 }}>
                Duration
              </div>
              <input
                className="wk-input"
                value={duration}
                onFocus={selectOnFocus}
                onChange={(ev) => onDurationChange(ev.target.value)}
                placeholder="1:30"
              />
            </label>
          </div>

          <div>
            <div className="wk-screen-sub" style={{ marginBottom: 6 }}>
              Timesheet code &amp; activity
            </div>
            <button
              type="button"
              className="wk-taskchip"
              style={{ width: '100%' }}
              onClick={onOpenPicker}
            >
              <span
                className="wk-dot"
                style={{ background: code ? code.color : 'var(--wk-amber)' }}
              />
              <span style={{ textAlign: 'left', flex: 1 }}>
                <span className="wk-taskchip-main" style={{ display: 'block' }}>
                  {code ? code.name : 'Uncategorized'}
                </span>
                <span className="wk-taskchip-sub" style={{ display: 'block' }}>
                  {code
                    ? `${code.number}${entry.activity ? ` · ${entry.activity}` : ''}`
                    : 'pick a code'}
                </span>
              </span>
              <span className="wk-taskchip-caret">change ⌄</span>
            </button>
          </div>

          <label>
            <div className="wk-screen-sub" style={{ marginBottom: 6 }}>
              Description
            </div>
            <input
              className="wk-input"
              value={description}
              onFocus={selectOnFocus}
              onChange={(ev) => setDescription(ev.target.value)}
              placeholder="Add a description…"
            />
          </label>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 4,
            }}
          >
            <div>
              {onDelete && (
                <button
                  type="button"
                  className="wk-btn wk-btn-danger"
                  style={{ padding: '10px 18px' }}
                  onClick={() => {
                    onDelete()
                    onClose()
                  }}
                >
                  Delete
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="wk-btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="wk-btn wk-btn-primary"
                style={{ padding: '10px 22px' }}
                onClick={save}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
