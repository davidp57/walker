import { useState } from 'react'
import type { Entry } from '../types'
import { formatClock, formatHoursMinutes, parseMilitaryClock, selectOnFocus } from '../lib/time'

interface StaleTimerModalProps {
  entry: Entry // the running entry, dated before today
  dayLabel: string // how that day reads in the Activity view ("Yesterday", "Thu, Aug 20")
  elapsedMinutes: number // how long it has been running, for the "you probably didn't work this" line
  onSetEnd: (minute: number) => void // the user's real end time, on the entry's own day
  onDiscard: () => void // the Timer tracked nothing worth keeping
  onClose: () => void // deal with it later — the prompt is not a trap
}

/**
 * A Timer still running from an earlier day (BIZ-091).
 *
 * Walker cannot know when the user stopped working, and it never invents a duration (ADR-0005), so it
 * asks. The alternative — the old behaviour — was to close the entry with *today's* minute, which
 * wrote an end before the start and silently reduced a tracked day to `0:00`.
 *
 * The end time is entered on the **entry's own day**, which is what makes the prompt unambiguous: a
 * timer opened yesterday at 10:00 ends at yesterday's 17:30, never at today's.
 */
export function StaleTimerModal({
  entry,
  dayLabel,
  elapsedMinutes,
  onSetEnd,
  onDiscard,
  onClose,
}: StaleTimerModalProps) {
  const [end, setEnd] = useState('')
  const [error, setError] = useState<string | null>(null)

  const apply = () => {
    const minute = parseMilitaryClock(end)
    if (minute == null) {
      setError('Enter the time you stopped, as 24h digits — 1730.')
      return
    }
    if (minute < entry.start) {
      setError(`It has to be at or after ${formatClock(entry.start)}, when the Timer started.`)
      return
    }
    onSetEnd(minute)
  }

  return (
    <div className="wk-overlay">
      {/* BIZ-059: no outside-click dismiss — a form modal closes only via ✕ / Cancel / its action. */}
      <div className="wk-modal" style={{ maxWidth: 520 }}>
        <div className="wk-modal-head">
          <span className="wk-modal-title">This Timer is still running from {dayLabel}</span>
          <button
            type="button"
            className="wk-modal-close"
            onClick={onClose}
            title="Deal with it later"
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="wk-screen-sub">
            It has been running since <strong>{dayLabel}</strong> at{' '}
            <strong>{formatClock(entry.start)}</strong> — {formatHoursMinutes(elapsedMinutes)} ago.
            Walker won&apos;t guess when you stopped, so the entry stays as it is until you say.
          </div>

          <label>
            <div className="wk-screen-sub" style={{ marginBottom: 6 }}>
              When did you stop, on {dayLabel}?
            </div>
            <input
              className="wk-input"
              autoFocus
              value={end}
              onFocus={selectOnFocus}
              onChange={(ev) => {
                setEnd(ev.target.value)
                setError(null)
              }}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter') apply()
              }}
              placeholder="1730"
            />
          </label>

          {error && (
            <div className="wk-modal-empty" style={{ color: 'var(--wk-red, #e5644e)' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 4 }}>
            <button
              type="button"
              className="wk-btn-ghost"
              onClick={onDiscard}
              title="Delete the entry — this Timer tracked nothing real"
            >
              Discard the entry
            </button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="wk-btn-ghost" onClick={onClose}>
                Later
              </button>
              <button
                type="button"
                className="wk-btn wk-btn-primary"
                style={{ padding: '10px 22px' }}
                onClick={apply}
              >
                Set the end time
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
