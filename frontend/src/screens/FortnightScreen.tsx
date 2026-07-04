import { useRef, useState } from 'react'
import type { ChecklistState, DayColumn, FortnightRow } from '../types'
import { checklistKey } from '../types'
import { FortnightGrid } from '../components/FortnightGrid'

type FortnightMode = 'review' | 'enter'

interface FortnightScreenProps {
  periodLabel: string // "1 – 15 July 2026"
  days: DayColumn[]
  reviewRows: FortnightRow[] // grouped by code — virtual codes are their own rows (Review)
  enterRows: FortnightRow[] // resolved to the real code (ADR-0008) — Enter in Timesheet system
  runningCell: { key: string; day: number } | null // the live timer's cell (read-only, tinted) — Review
  // The running cell's key, resolved virtual→real (ADR-0008) so it matches `enterRows`' keys. Falls
  // back to `runningCell` when omitted (equivalent when the running entry is on a real code already).
  enterRunningCell?: { key: string; day: number } | null
  checked: ChecklistState
  onPrev: () => void // previous fortnight (crosses months)
  onNext: () => void // next fortnight
  onThis: () => void // jump back to the current fortnight
  onOpenCell: (rowKey: string, day: number) => void // Review: drill into a cell's entries
  onAddCell: (rowKey: string, day: number) => void // Review: click an empty cell → prefilled new entry
  onAddEntry: () => void // Review: add an entry directly into this period
  onChecklistChange: (next: ChecklistState) => void // Enter in Timesheet system: full next map (entered flags)
  onChecklistReset: () => void // Enter in Timesheet system: clear all marks for the period
}

/**
 * Unified Fortnight screen (BIZ-007): one grid, one header toggle between Review (by-code mirror of
 * the Timesheet system, `+ Add entry`, no progress bar) and Enter in Timesheet system (resolved to the real code — ADR-0008 —
 * tick-as-you-key checklist with progress bar and Reset). The toggle is purely presentational state
 * local to this screen: switching modes never reloads data, it only changes which row set and
 * controls are rendered.
 */
export function FortnightScreen({
  periodLabel,
  days,
  reviewRows,
  enterRows,
  runningCell,
  enterRunningCell = runningCell,
  checked,
  onPrev,
  onNext,
  onThis,
  onOpenCell,
  onAddCell,
  onAddEntry,
  onChecklistChange,
  onChecklistReset,
}: FortnightScreenProps) {
  const [mode, setMode] = useState<FortnightMode>('review')
  const lastIndex = useRef<number | null>(null)

  // Column-major fill order over interactive (filled, non-weekend, non-absence, non-running) cells —
  // the natural order for entering a full day. The running cell is excluded: it isn't final until
  // the timer stops, so it can never be "entered".
  const fillOrder: string[] = []
  days.forEach((d) => {
    if (d.isWeekend || d.isAbsence) return
    enterRows.forEach((r) => {
      const isRunning = enterRunningCell?.key === r.key && enterRunningCell?.day === d.day
      if ((r.minutesByDay[d.day] || 0) > 0 && !isRunning) fillOrder.push(checklistKey(r.key, d.day))
    })
  })

  const total = fillOrder.length
  const doneCount = fillOrder.filter((k) => checked[k]).length
  const pct = total ? Math.round((doneCount / total) * 100) : 0

  const toggleCell = (rowKey: string, day: number, mods: { shift: boolean; meta: boolean }) => {
    const key = checklistKey(rowKey, day)
    const idx = fillOrder.indexOf(key)
    const next: ChecklistState = { ...checked }

    if (mods.shift && lastIndex.current != null && idx >= 0) {
      const [a, b] = [lastIndex.current, idx].sort((x, y) => x - y)
      for (let i = a; i <= b; i++) next[fillOrder[i]] = true // vertical range → entered
    } else {
      if (next[key]) delete next[key]
      else next[key] = true // plain / ⌘-Ctrl toggle
    }
    lastIndex.current = idx
    onChecklistChange(next)
  }

  const toggleRow = (rowKey: string) => {
    const next: ChecklistState = { ...checked }
    days.forEach((d) => {
      if (d.isWeekend || d.isAbsence) return
      const isRunning = enterRunningCell?.key === rowKey && enterRunningCell?.day === d.day
      const r = enterRows.find((x) => x.key === rowKey)
      if (r && (r.minutesByDay[d.day] || 0) > 0 && !isRunning)
        next[checklistKey(rowKey, d.day)] = true
    })
    onChecklistChange(next)
  }

  return (
    <div className="wk-screen">
      <div className="wk-screen-head">
        <div>
          <div className="wk-screen-title">
            Fortnight —{' '}
            <span className="wk-accent">
              {mode === 'review' ? 'by code' : 'enter in Timesheet system'}
            </span>
          </div>
          <div className="wk-screen-sub">
            {mode === 'review'
              ? 'A 1:1 mirror of the Timesheet system. Real durations — round in the Timesheet system, not here.'
              : 'Tick each cell as you key it into the Timesheet system. Shift-click for a range, ⌘/Ctrl-click to toggle one.'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="wk-period">
            <button
              type="button"
              className={`wk-seg${mode === 'review' ? ' is-active' : ''}`}
              onClick={() => setMode('review')}
            >
              Review
            </button>
            <button
              type="button"
              className={`wk-seg${mode === 'enter' ? ' is-active' : ''}`}
              onClick={() => setMode('enter')}
            >
              Enter in Timesheet system
            </button>
          </div>
          <div className="wk-period">
            <button type="button" className="wk-seg" onClick={onPrev} title="Previous fortnight">
              ◀
            </button>
            <button type="button" className="wk-seg" onClick={onThis} title="Current fortnight">
              Today
            </button>
            <button type="button" className="wk-seg" onClick={onNext} title="Next fortnight">
              ▶
            </button>
          </div>
          <div className="wk-period-label">{periodLabel}</div>
          {mode === 'review' ? (
            <button
              type="button"
              className="wk-btn wk-btn-primary"
              style={{ padding: '8px 16px' }}
              onClick={onAddEntry}
            >
              + Add entry
            </button>
          ) : (
            <>
              <div style={{ textAlign: 'right' }}>
                <div className="wk-progress-count">
                  {doneCount} <span>/ {total}</span>
                </div>
                <div className="wk-progress-label">lines entered</div>
              </div>
              <button type="button" className="wk-btn-ghost" onClick={onChecklistReset}>
                Reset
              </button>
            </>
          )}
        </div>
      </div>

      {mode === 'enter' && (
        <div className="wk-progress">
          <div className="wk-progress-bar" style={{ width: `${pct}%` }} />
        </div>
      )}

      <div className="wk-grid-wrap">
        {mode === 'review' ? (
          <FortnightGrid
            mode="fortnight"
            days={days}
            rows={reviewRows}
            runningCell={runningCell}
            onOpenCell={onOpenCell}
            onAddCell={onAddCell}
          />
        ) : (
          <FortnightGrid
            mode="checklist"
            days={days}
            rows={enterRows}
            checked={checked}
            runningCell={enterRunningCell}
            onToggleCell={toggleCell}
            onToggleRow={toggleRow}
          />
        )}
      </div>

      {mode === 'review' && (
        <div className="wk-legend">
          <span>
            <span
              className="wk-legend-swatch"
              style={{ background: 'var(--wk-weekend)', border: '1px solid var(--wk-line)' }}
            />
            Weekend
          </span>
          <span>
            <span
              className="wk-legend-swatch"
              style={{
                background:
                  'repeating-linear-gradient(45deg,#171a20,#171a20 3px,#1b1f27 3px,#1b1f27 6px)',
              }}
            />
            Absence (from the Timesheet system)
          </span>
          <span>
            <span
              className="wk-legend-swatch"
              style={{
                background: 'var(--wk-accent-soft)',
                border: '1px solid var(--wk-accent-line)',
              }}
            />
            Running now (read-only)
          </span>
          <span style={{ color: 'var(--wk-text-mid)' }}>
            Click a cell to see and edit the entries behind it.
          </span>
        </div>
      )}
    </div>
  )
}
