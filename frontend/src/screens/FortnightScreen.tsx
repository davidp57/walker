import type { DayColumn, FortnightRow } from '../types'
import { FortnightGrid } from '../components/FortnightGrid'

interface FortnightScreenProps {
  periodLabel: string // "1 – 15 July 2026"
  days: DayColumn[]
  rows: FortnightRow[]
  runningCell: { key: string; day: number } | null // the live timer's cell (read-only, tinted)
  onPrev: () => void // previous fortnight (crosses months)
  onNext: () => void // next fortnight
  onThis: () => void // jump back to the current fortnight
  onOpenCell: (rowKey: string, day: number) => void // drill into a cell's entries
  onAddCell: (rowKey: string, day: number) => void // click an empty cell → prefilled new entry
  onAddEntry: () => void // add an entry directly into this period
}

export function FortnightScreen({
  periodLabel,
  days,
  rows,
  runningCell,
  onPrev,
  onNext,
  onThis,
  onOpenCell,
  onAddCell,
  onAddEntry,
}: FortnightScreenProps) {
  return (
    <div className="wk-screen">
      <div className="wk-screen-head">
        <div>
          <div className="wk-screen-title">
            Fortnight — <span className="wk-accent">by code</span>
          </div>
          <div className="wk-screen-sub">
            A 1:1 mirror of Time &amp; Expenses. Real durations — round in T&amp;E, not here.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
          <button
            type="button"
            className="wk-btn wk-btn-primary"
            style={{ padding: '8px 16px' }}
            onClick={onAddEntry}
          >
            + Add entry
          </button>
        </div>
      </div>

      <div className="wk-grid-wrap">
        <FortnightGrid
          mode="fortnight"
          days={days}
          rows={rows}
          runningCell={runningCell}
          onOpenCell={onOpenCell}
          onAddCell={onAddCell}
        />
      </div>

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
          Absence (from T&amp;E)
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
    </div>
  )
}
