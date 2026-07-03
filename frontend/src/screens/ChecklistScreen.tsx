import { useRef } from 'react'
import type { ChecklistState, DayColumn, FortnightRow } from '../types'
import { checklistKey } from '../types'
import { FortnightGrid } from '../components/FortnightGrid'

interface ChecklistScreenProps {
  days: DayColumn[]
  rows: FortnightRow[]
  checked: ChecklistState
  onChange: (next: ChecklistState) => void // full next map (entered-into-T&E flags)
  onReset: () => void
}

/**
 * "Enter in T&E" — tick each grid cell as you key it. Range selection is COLUMN-MAJOR (vertical):
 * fill order walks down a day column first, then across — the natural order for entering a full day.
 */
export function ChecklistScreen({ days, rows, checked, onChange, onReset }: ChecklistScreenProps) {
  const lastIndex = useRef<number | null>(null)

  // Column-major fill order over interactive (filled, non-weekend, non-absence) cells.
  const fillOrder: string[] = []
  days.forEach((d) => {
    if (d.isWeekend || d.isAbsence) return
    rows.forEach((r) => {
      if ((r.minutesByDay[d.day] || 0) > 0) fillOrder.push(checklistKey(r.key, d.day))
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
    onChange(next)
  }

  const toggleRow = (rowKey: string) => {
    const next: ChecklistState = { ...checked }
    days.forEach((d) => {
      if (d.isWeekend || d.isAbsence) return
      const r = rows.find((x) => x.key === rowKey)
      if (r && (r.minutesByDay[d.day] || 0) > 0) next[checklistKey(rowKey, d.day)] = true
    })
    onChange(next)
  }

  return (
    <div className="wk-screen">
      <div className="wk-screen-head">
        <div>
          <div className="wk-screen-title">Enter into T&amp;E</div>
          <div className="wk-screen-sub">
            Tick each cell as you key it into T&amp;E. Shift-click for a range, ⌘/Ctrl-click to
            toggle one.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ textAlign: 'right' }}>
            <div className="wk-progress-count">
              {doneCount} <span>/ {total}</span>
            </div>
            <div className="wk-progress-label">lines entered</div>
          </div>
          <button type="button" className="wk-btn-ghost" onClick={onReset}>
            Reset
          </button>
        </div>
      </div>

      <div className="wk-progress">
        <div className="wk-progress-bar" style={{ width: `${pct}%` }} />
      </div>

      <div className="wk-grid-wrap">
        <FortnightGrid
          mode="checklist"
          days={days}
          rows={rows}
          checked={checked}
          onToggleCell={toggleCell}
          onToggleRow={toggleRow}
        />
      </div>
    </div>
  )
}
