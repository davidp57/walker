import type { MouseEvent } from 'react'
import type { DayColumn, FortnightRow } from '../types'
import { checklistKey } from '../types'
import { formatDuration } from '../lib/time'

interface BaseProps {
  days: DayColumn[]
  rows: FortnightRow[]
}

interface FortnightModeProps extends BaseProps {
  mode: 'fortnight'
  runningCell: { key: string; day: number } | null // the live timer's cell — tinted, read-only
  onOpenCell: (rowKey: string, day: number) => void
  onAddCell: (rowKey: string, day: number) => void // click an empty working cell → new entry, prefilled
}

interface ChecklistModeProps extends BaseProps {
  mode: 'checklist'
  checked: Record<string, boolean>
  onToggleCell: (rowKey: string, day: number, mods: { shift: boolean; meta: boolean }) => void
  onToggleRow: (rowKey: string) => void
}

type FortnightGridProps = FortnightModeProps | ChecklistModeProps

/**
 * Shared BY-CODE grid. `fortnight` cells edit durations; `checklist` cells toggle "entered into T&E".
 * The visual geometry is identical so the two screens read 1:1.
 */
export function FortnightGrid(props: FortnightGridProps) {
  const { days, rows, mode } = props
  const isFortnight = mode === 'fortnight'

  // Column (daily) totals + grand total for the fortnight footer.
  const colTotal = (day: number) => rows.reduce((sum, r) => sum + (r.minutesByDay[day] || 0), 0)
  const grandTotal = days.reduce(
    (sum, d) => (d.isWeekend || d.isAbsence ? sum : sum + colTotal(d.day)),
    0,
  )

  return (
    <table className="wk-grid">
      <thead>
        <tr>
          <th className="wk-grid-rowhead-h">Code · Activity</th>
          {days.map((d) => (
            <th key={d.day} className={`wk-day${d.isWeekend ? ' is-weekend' : ''}`}>
              <div className="wk-day-name">{d.weekday}</div>
              <div className="wk-day-num">{d.day}</div>
              <div
                className={`wk-day-sub${d.isAbsence ? ' is-absence' : d.isToday ? ' is-today' : ''}`}
              >
                {d.isAbsence ? 'leave' : d.isToday ? 'today' : ''}
              </div>
            </th>
          ))}
          {isFortnight && <th className="wk-total-h">Total</th>}
        </tr>
      </thead>

      <tbody>
        {rows.map((row) => {
          const fillDays = days.filter(
            (d) => !d.isWeekend && !d.isAbsence && (row.minutesByDay[d.day] || 0) > 0,
          )
          const doneCount =
            mode === 'checklist'
              ? fillDays.filter(
                  (d) => (props as ChecklistModeProps).checked[checklistKey(row.key, d.day)],
                ).length
              : 0
          const rowTotal = fillDays.reduce((s, d) => s + (row.minutesByDay[d.day] || 0), 0)

          return (
            <tr key={row.key}>
              <td className="wk-rowhead">
                <div className="wk-rowhead-inner">
                  <span className="wk-dot" style={{ background: row.code.color }} />
                  <div className="wk-rowhead-body">
                    <div className="wk-rowhead-label" title={row.code.name}>
                      {row.code.name}
                    </div>
                    {row.activity !== row.code.name && (
                      <div className="wk-rowhead-act">{row.activity}</div>
                    )}
                    <div className="wk-rowhead-code">{row.code.number}</div>
                  </div>
                  {mode === 'checklist' && (
                    <button
                      type="button"
                      className={`wk-rowbadge${fillDays.length > 0 && doneCount === fillDays.length ? ' is-alldone' : ''}`}
                      title="Mark whole row as entered"
                      onClick={() => (props as ChecklistModeProps).onToggleRow(row.key)}
                    >
                      {doneCount}/{fillDays.length}
                    </button>
                  )}
                </div>
              </td>

              {days.map((d) => {
                const minutes = row.minutesByDay[d.day] || 0
                const filled = minutes > 0
                const key = checklistKey(row.key, d.day)
                const done = mode === 'checklist' && (props as ChecklistModeProps).checked[key]

                const isWorkingDay = !d.isWeekend && !d.isAbsence
                const running =
                  isFortnight &&
                  (props as FortnightModeProps).runningCell?.key === row.key &&
                  (props as FortnightModeProps).runningCell?.day === d.day
                // Fortnight: filled cells drill in; empty working cells add a prefilled entry. The
                // live-timer cell is read-only (stop the timer to edit it).
                const canAdd = isFortnight && isWorkingDay && !filled && !running
                const clickable = isWorkingDay && !running && (filled || canAdd)
                const cls = [
                  'wk-cell',
                  d.isWeekend ? 'is-weekend' : '',
                  d.isAbsence ? 'is-absence' : '',
                  !filled && isWorkingDay ? 'is-empty' : '',
                  clickable ? 'is-clickable' : '',
                  canAdd ? 'is-addable' : '',
                  running ? 'is-running' : '',
                  done ? 'is-done' : '',
                ]
                  .filter(Boolean)
                  .join(' ')

                const onClick = (e: MouseEvent) => {
                  if (!clickable) return
                  if (isFortnight) {
                    if (filled) {
                      ;(props as FortnightModeProps).onOpenCell(row.key, d.day)
                    } else {
                      ;(props as FortnightModeProps).onAddCell(row.key, d.day)
                    }
                  } else {
                    ;(props as ChecklistModeProps).onToggleCell(row.key, d.day, {
                      shift: e.shiftKey,
                      meta: e.metaKey || e.ctrlKey,
                    })
                  }
                }

                return (
                  <td
                    key={d.day}
                    className={cls}
                    onClick={onClick}
                    title={running ? 'Timer running — stop it to edit' : undefined}
                  >
                    <span>{filled || running ? formatDuration(minutes) : ''}</span>
                    {running && <span className="wk-cell-live" />}
                    {canAdd && <span className="wk-cell-add">+</span>}
                    {done && <span className="wk-cell-check">✓</span>}
                  </td>
                )
              })}

              {isFortnight && <td className="wk-rowtotal">{formatDuration(rowTotal)}</td>}
            </tr>
          )
        })}
      </tbody>

      {isFortnight && (
        <tfoot>
          <tr>
            <td className="wk-foot-label">Daily total</td>
            {days.map((d) => {
              const t = colTotal(d.day)
              return (
                <td key={d.day} className={`wk-coltotal${d.isWeekend ? ' is-weekend' : ''}`}>
                  {!d.isWeekend && !d.isAbsence && t > 0 ? formatDuration(t) : ''}
                </td>
              )
            })}
            <td className="wk-grandtotal">{formatDuration(grandTotal)}</td>
          </tr>
        </tfoot>
      )}
    </table>
  )
}
