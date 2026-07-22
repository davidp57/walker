import { useState } from 'react'
import type { ActivityName, Entry, ReferenceCode, TimesheetCode } from '../types'
import { CodePicker } from './CodePicker'
import {
  formatClock,
  formatDuration,
  parseDuration,
  parseMilitaryClock,
  selectOnFocus,
} from '../lib/time'

/** What the break carves out, and how to (optionally) fill the hole. */
export interface BreakDraft {
  breakStartMinute: number
  breakEndMinute: number
  timesheetCodeId: string | null
  activity: ActivityName | null
}

interface BreakModalProps {
  entry: Entry
  nowMinute: number // upper bound for a running entry (its end is still open)
  codes: TimesheetCode[] // visible codes, for the optional "categorize the break" picker
  onApply: (draft: BreakDraft) => void
  onClose: () => void
  onSearchReference?: (q: string) => Promise<ReferenceCode[]>
  onActivateReference?: (ref: ReferenceCode) => void
}

/**
 * Punch a hole in an entry (BIZ-076): pick the break window (start + duration + end, linked like the
 * entry editor) and optionally categorize the hole. Empty hole = untracked time; categorized = its
 * own entry (e.g. a lunch break).
 */
export function BreakModal({
  entry,
  nowMinute,
  codes,
  onApply,
  onClose,
  onSearchReference,
  onActivateReference,
}: BreakModalProps) {
  const lower = entry.start
  const upper = entry.end ?? nowMinute
  const span = Math.max(0, upper - lower)
  // Default: a 20-minute break centred in the entry (clamped to fit).
  const defaultDur = Math.min(20, span)
  const defaultStart = lower + Math.max(0, Math.floor((span - defaultDur) / 2))

  const [start, setStart] = useState(formatClock(defaultStart))
  const [end, setEnd] = useState(formatClock(defaultStart + defaultDur))
  const [duration, setDuration] = useState(formatDuration(defaultDur))
  const [holeCodeId, setHoleCodeId] = useState<string | null>(null)
  const [holeActivity, setHoleActivity] = useState<ActivityName | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const holeCode = holeCodeId ? (codes.find((c) => c.id === holeCodeId) ?? null) : null

  const apply = () => {
    const bs = parseMilitaryClock(start)
    const be = parseMilitaryClock(end)
    if (bs == null || be == null) {
      setError('Enter a valid start and end.')
      return
    }
    if (!(lower <= bs && bs < be && be <= upper)) {
      setError(`The break must fall between ${formatClock(lower)} and ${formatClock(upper)}.`)
      return
    }
    onApply({
      breakStartMinute: bs,
      breakEndMinute: be,
      timesheetCodeId: holeCodeId,
      activity: holeActivity,
    })
    onClose()
  }

  return (
    <div className="wk-overlay">
      {/* BIZ-059: no outside-click dismiss — a form modal closes only via ✕ / Cancel / Apply. */}
      <div className="wk-modal">
        <div className="wk-modal-head">
          <span className="wk-modal-title">Insert a break</span>
          <button type="button" className="wk-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="wk-screen-sub">
            Carve non-worked time out of {formatClock(lower)}–
            {entry.end == null ? 'now' : formatClock(upper)}. The gap is left untracked unless you
            categorize it below.
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <label style={{ flex: 1 }}>
              <div className="wk-screen-sub" style={{ marginBottom: 6 }}>
                Break start
              </div>
              <input
                className="wk-input"
                value={start}
                onFocus={selectOnFocus}
                onChange={(ev) => onStartChange(ev.target.value)}
                placeholder="1200"
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
                placeholder="0:20"
              />
            </label>
            <label style={{ flex: 1 }}>
              <div className="wk-screen-sub" style={{ marginBottom: 6 }}>
                Break end
              </div>
              <input
                className="wk-input"
                value={end}
                onFocus={selectOnFocus}
                onChange={(ev) => onEndChange(ev.target.value)}
                placeholder="1220"
              />
            </label>
          </div>

          <div>
            <div className="wk-screen-sub" style={{ marginBottom: 6 }}>
              Categorize the break (optional)
            </div>
            {holeCode ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  className="wk-taskchip"
                  style={{ flex: 1 }}
                  onClick={() => setPickerOpen(true)}
                >
                  <span className="wk-dot" style={{ background: holeCode.color }} />
                  <span style={{ textAlign: 'left', flex: 1 }}>
                    <span className="wk-taskchip-main" style={{ display: 'block' }}>
                      {holeCode.name}
                    </span>
                    <span className="wk-taskchip-sub" style={{ display: 'block' }}>
                      {holeCode.number}
                      {holeActivity ? ` · ${holeActivity}` : ''}
                    </span>
                  </span>
                  <span className="wk-taskchip-caret">change ⌄</span>
                </button>
                <button
                  type="button"
                  className="wk-btn-icon"
                  title="Leave the break untracked"
                  onClick={() => {
                    setHoleCodeId(null)
                    setHoleActivity(null)
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="wk-input wk-task-code-trigger"
                style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
                onClick={() => setPickerOpen(true)}
              >
                <span className="wk-screen-sub">Leave untracked — or pick a code…</span>
              </button>
            )}
          </div>

          {error && (
            <div className="wk-modal-empty" style={{ color: 'var(--wk-red, #e5644e)' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
            <button type="button" className="wk-btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="wk-btn wk-btn-primary"
              style={{ padding: '10px 22px' }}
              onClick={apply}
            >
              Insert break
            </button>
          </div>
        </div>
      </div>

      {pickerOpen && (
        <CodePicker
          title="Categorize the break"
          codes={codes}
          onPick={(codeId, activity) => {
            setHoleCodeId(codeId)
            setHoleActivity(activity ?? null)
            setPickerOpen(false)
          }}
          onClose={() => setPickerOpen(false)}
          onSearchReference={onSearchReference}
          onActivateReference={onActivateReference}
        />
      )}
    </div>
  )
}
