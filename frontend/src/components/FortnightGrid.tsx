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
  runningCell: { key: string; day: number } | null // the live timer's cell — tinted, read-only, not tickable
  onToggleCell: (rowKey: string, day: number, mods: { shift: boolean; meta: boolean }) => void
  onToggleRow: (rowKey: string) => void
}

type FortnightGridProps = FortnightModeProps | ChecklistModeProps

/**
 * Shared BY-CODE grid. `fortnight` cells edit durations; `checklist` cells toggle "entered into T&E".
 * The Total column and the running-timer's tinted/read-only cell show in both modes.
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
          <th className="wk-total-h">Total</th>
        </tr>
      </thead>

      <tbody>
        {rows.map((row) => {
          // In checklist mode, the running timer's cell is excluded from fill/badge/total accounting
          // — a running cell is never "entered" (it isn't final until the timer stops).
          const isRunningCell = (d: { day: number }) =>
            props.runningCell?.key === row.key && props.runningCell?.day === d.day
          const fillDays = days.filter(
            (d) =>
              !d.isWeekend &&
              !d.isAbsence &&
              (row.minutesByDay[d.day] || 0) > 0 &&
              !(mode === 'checklist' && isRunningCell(d)),
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
                  props.runningCell?.key === row.key && props.runningCell?.day === d.day
                // Fortnight: filled cells drill in; empty working cells add a prefilled entry. The
                // live-timer cell is read-only in both modes (stop the timer to edit/tick it).
                const canAdd = isFortnight && isWorkingDay && !filled && !running
                const clickable = isWorkingDay && !running && (filled || canAdd)
                // Enter in T&E: every filled, tickable cell shows its checkbox at rest — no hover
                // needed to discover it (BIZ-008). The running-timer cell never shows one.
                const showCheckbox = mode === 'checklist' && filled && !running
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
                    {showCheckbox && (
                      <input
                        type="checkbox"
                        className="wk-cell-checkbox"
                        checked={!!done}
                        readOnly
                        aria-label={`Mark ${formatDuration(minutes)} as entered`}
                      />
                    )}
                    <span>{filled || running ? formatDuration(minutes) : ''}</span>
                    {running && <span className="wk-cell-live" />}
                    {canAdd && <span className="wk-cell-add">+</span>}
                  </td>
                )
              })}

              <td className="wk-rowtotal">{formatDuration(rowTotal)}</td>
            </tr>
          )
        })}
      </tbody>

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
    </table>
  )
}
