import { useEffect, useState, type KeyboardEvent } from 'react'
import type { CodeTotals, TimesheetCode } from '../types'
import { formatHoursMinutes } from '../lib/time'

type RangeKey = 'all' | 'period' | 'month' | 'year' | 'custom'

interface CodeTotalsModalProps {
  code: TimesheetCode
  periodStart: string // the current Timesheet period's bounds (ADR-0009), for the "Current period" preset
  periodEnd: string
  today: string // ISO date, injected rather than read from the clock so this stays testable
  onFetch: (range: { from?: string; to?: string }) => Promise<CodeTotals>
  onClose: () => void
}

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: 'all', label: 'All time' },
  { key: 'period', label: 'Current period' },
  { key: 'month', label: 'This month' },
  { key: 'year', label: 'This year' },
  { key: 'custom', label: 'Custom' },
]

/** Last day of `today`'s month, timezone-safe (day 0 of the next month). */
const endOfMonth = (today: string): string => {
  const [y, m] = today.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
}

const formatDay = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00`)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * "How much time did you spend on X?" — the one question Walker captured the data for but could not
 * answer (BIZ-089).
 *
 * Every other aggregation in the app is bound to a Timesheet period, because it exists to fill the
 * Timesheet system. This one is not: the range is arbitrary, and **All time** is the default because
 * "how much have I ever spent on this" is the most common form of the question and needs no input.
 *
 * Minutes are exact (ADR-0005) — no rounding anywhere on this path.
 */
export function CodeTotalsModal({
  code,
  periodStart,
  periodEnd,
  today,
  onFetch,
  onClose,
}: CodeTotalsModalProps) {
  const [rangeKey, setRangeKey] = useState<RangeKey>('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [totals, setTotals] = useState<CodeTotals | null>(null)
  const [failed, setFailed] = useState(false)

  const range = ((): { from?: string; to?: string } => {
    switch (rangeKey) {
      case 'period':
        return { from: periodStart, to: periodEnd }
      case 'month':
        return { from: `${today.slice(0, 7)}-01`, to: endOfMonth(today) }
      case 'year':
        return { from: `${today.slice(0, 4)}-01-01`, to: `${today.slice(0, 4)}-12-31` }
      case 'custom':
        return {
          ...(customFrom ? { from: customFrom } : {}),
          ...(customTo ? { to: customTo } : {}),
        }
      default:
        return {}
    }
  })()

  // Serialised so the effect re-runs on a *value* change rather than on every new object identity.
  const rangeKeyed = JSON.stringify(range)
  useEffect(() => {
    let cancelled = false
    setFailed(false)
    onFetch(JSON.parse(rangeKeyed) as { from?: string; to?: string })
      .then((result) => !cancelled && setTotals(result))
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [rangeKeyed, onFetch])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const delta =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? -1
          : 0
    if (delta === 0) return
    e.preventDefault()
    const index = RANGE_OPTIONS.findIndex((o) => o.key === rangeKey)
    setRangeKey(RANGE_OPTIONS[(index + delta + RANGE_OPTIONS.length) % RANGE_OPTIONS.length].key)
  }

  const isEmpty = totals !== null && totals.entries === 0

  return (
    <div className="wk-overlay" onClick={onClose}>
      <div
        className="wk-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Time spent on ${code.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="wk-modal-head">
          <span className="wk-modal-title">
            <span className="wk-dot" style={{ background: code.color }} /> Time on {code.name}
          </span>
          <button type="button" className="wk-modal-close" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div
          className="wk-totals-ranges"
          role="radiogroup"
          aria-label="Range"
          onKeyDown={onKeyDown}
        >
          {RANGE_OPTIONS.map((o) => {
            const active = o.key === rangeKey
            return (
              <button
                key={o.key}
                type="button"
                role="radio"
                aria-checked={active}
                tabIndex={active ? 0 : -1}
                className={`wk-seg${active ? ' is-active' : ''}`}
                onClick={() => setRangeKey(o.key)}
              >
                {o.label}
              </button>
            )
          })}
        </div>

        {rangeKey === 'custom' && (
          <div className="wk-totals-custom">
            <label className="wk-totals-field">
              <span>From</span>
              <input
                type="date"
                className="wk-input"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
            </label>
            <label className="wk-totals-field">
              <span>To</span>
              <input
                type="date"
                className="wk-input"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </label>
          </div>
        )}

        <div className="wk-modal-body">
          {failed && <p className="wk-totals-empty">Could not load the totals for this code.</p>}

          {totals && !failed && isEmpty && (
            <p className="wk-totals-empty">
              {rangeKey === 'all'
                ? 'No time recorded on this code yet.'
                : 'No time recorded in this range.'}
            </p>
          )}

          {totals && !failed && !isEmpty && (
            <>
              <div className="wk-totals-headline">
                <span className="wk-totals-value">{formatHoursMinutes(totals.minutes)}</span>
                <span className="wk-totals-meta">
                  {totals.entries} {totals.entries > 1 ? 'entries' : 'entry'} · {totals.days}{' '}
                  {totals.days > 1 ? 'days' : 'day'}
                  {totals.start &&
                    totals.end &&
                    ` · ${formatDay(totals.start)} → ${formatDay(totals.end)}`}
                </span>
              </div>

              {totals.running && (
                <p className="wk-totals-running" role="note">
                  A timer is running on this code — its time is not counted yet.
                </p>
              )}

              <ul className="wk-totals-list">
                {totals.byActivity.map((row) => (
                  <li key={row.activity ?? '—'} className="wk-totals-item">
                    <span className="wk-totals-act">{row.activity ?? 'No activity'}</span>
                    <span className="wk-totals-bar" aria-hidden="true">
                      <span
                        style={{
                          width: `${totals.minutes ? (row.minutes / totals.minutes) * 100 : 0}%`,
                          background: code.color,
                        }}
                      />
                    </span>
                    <span className="wk-totals-act-min">{formatHoursMinutes(row.minutes)}</span>
                  </li>
                ))}
              </ul>

              {totals.rollup && (
                <div className="wk-totals-rollup">
                  <span className="wk-totals-act">Including its virtual codes</span>
                  <span className="wk-totals-act-min">
                    {formatHoursMinutes(totals.rollup.minutes)}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
