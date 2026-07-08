import type { MouseEvent } from 'react'
import { useState } from 'react'
import type { DayColumn, PeriodRow } from '../types'
import { checklistKey } from '../types'
import { formatDuration } from '../lib/time'

interface BaseProps {
  days: DayColumn[]
  rows: PeriodRow[]
}

interface PeriodModeProps extends BaseProps {
  mode: 'period'
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

type PeriodGridProps = PeriodModeProps | ChecklistModeProps

const COPY_FEEDBACK_MS = 1500

/**
 * Small icon button that copies the Timesheet-system code number to the clipboard — keying into the
 * Timesheet system means retyping this number by hand, so a one-click copy removes a transcription step. Shows a brief
 * checkmark confirmation, then reverts.
 */
function CopyCodeButton({ codeNumber }: { codeNumber: string }) {
  const [copied, setCopied] = useState(false)

  const onClick = (e: MouseEvent) => {
    e.stopPropagation()
    void navigator.clipboard.writeText(codeNumber).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), COPY_FEEDBACK_MS)
    })
  }

  const label = copied ? 'Copied!' : `Copy code ${codeNumber}`

  return (
    <button
      type="button"
      className="wk-btn-icon wk-copy-code"
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      {copied ? '✓' : '⧉'}
    </button>
  )
}

/**
 * One row's line item within a day card — the code/activity/duration triplet for a single day,
 * shown when that row has minutes on that day. Mirrors a single `<td class="wk-cell">` from the
 * table, but rendered as a row-major line inside a day-major card instead of a table cell.
 */
function DayCardLine({ row, d, props }: { row: PeriodRow; d: DayColumn; props: PeriodGridProps }) {
  const { mode } = props
  const minutes = row.minutesByDay[d.day] || 0
  const key = checklistKey(row.key, d.day)
  const done = mode === 'checklist' && (props as ChecklistModeProps).checked[key]
  const running = props.runningCell?.key === row.key && props.runningCell?.day === d.day
  const isWorkingDay = !d.isWeekend && !d.isAbsence
  const clickable = isWorkingDay && !running
  const showCheckbox = mode === 'checklist' && !running

  const onClick = (e: MouseEvent) => {
    if (!clickable) return
    if (mode === 'period') {
      ;(props as PeriodModeProps).onOpenCell(row.key, d.day)
    } else {
      ;(props as ChecklistModeProps).onToggleCell(row.key, d.day, {
        shift: e.shiftKey,
        meta: e.metaKey || e.ctrlKey,
      })
    }
  }

  const cls = ['wk-daycard-line', clickable ? 'is-clickable' : '', running ? 'is-running' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <div
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
      <span className="wk-dot" style={{ background: row.code.color }} />
      <div className="wk-daycard-line-body">
        <div className="wk-daycard-line-label">{row.code.name}</div>
        {row.activity !== row.code.name && (
          <div className="wk-daycard-line-act">{row.activity}</div>
        )}
      </div>
      <div className="wk-daycard-line-dur">{formatDuration(minutes)}</div>
    </div>
  )
}

/**
 * Phone-portrait rendering of the same grid data: one card per day (instead of one column per
 * day), each listing that day's filled code/activity/duration lines. Rendered unconditionally
 * alongside the table — CSS (`@media (max-width: 640px)`) toggles which one is visible, so no JS
 * breakpoint state is needed. See BIZ-034.
 */
function DayCards(props: PeriodGridProps) {
  const { days, rows } = props

  const colTotal = (day: number) => rows.reduce((sum, r) => sum + (r.minutesByDay[day] || 0), 0)
  const grandTotal = days.reduce(
    (sum, d) => (d.isWeekend || d.isAbsence ? sum : sum + colTotal(d.day)),
    0,
  )

  return (
    <div className="wk-daycards">
      {days.map((d) => {
        const lines = rows.filter(
          (r) =>
            (r.minutesByDay[d.day] || 0) > 0 ||
            (props.runningCell?.key === r.key && props.runningCell?.day === d.day),
        )
        const cls = ['wk-daycard', d.isWeekend ? 'is-weekend' : '', d.isAbsence ? 'is-absence' : '']
          .filter(Boolean)
          .join(' ')

        return (
          <div key={d.day} className={cls}>
            <div className="wk-daycard-head">
              <div className="wk-daycard-date">
                <span className="wk-daycard-weekday">{d.weekday}</span>
                <span className="wk-daycard-num">{d.day}</span>
                {(d.isAbsence || d.isToday) && (
                  <span className={`wk-day-sub${d.isAbsence ? ' is-absence' : ' is-today'}`}>
                    {d.isAbsence ? 'leave' : 'today'}
                  </span>
                )}
              </div>
              {!d.isWeekend && !d.isAbsence && (
                <div className="wk-daycard-total">{formatDuration(colTotal(d.day))}</div>
              )}
            </div>
            <div className="wk-daycard-lines">
              {lines.map((row) => (
                <DayCardLine key={row.key} row={row} d={d} props={props} />
              ))}
            </div>
          </div>
        )
      })}
      <div className="wk-daycards-grandtotal">
        <span>Total</span>
        <span>{formatDuration(grandTotal)}</span>
      </div>
    </div>
  )
}

/**
 * Shared BY-CODE grid. `period` cells edit durations; `checklist` cells toggle "entered into the Timesheet system".
 * The Total column and the running-timer's tinted/read-only cell show in both modes. Renders both the
 * desktop table and the phone day-card list (BIZ-034) — CSS decides which is visible at a given width.
 */
export function PeriodGrid(props: PeriodGridProps) {
  const { days, rows, mode } = props
  const isPeriod = mode === 'period'

  // Column (daily) totals + grand total for the Timesheet period footer.
  const colTotal = (day: number) => rows.reduce((sum, r) => sum + (r.minutesByDay[day] || 0), 0)
  const grandTotal = days.reduce(
    (sum, d) => (d.isWeekend || d.isAbsence ? sum : sum + colTotal(d.day)),
    0,
  )

  return (
    <>
      <DayCards {...props} />
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
                      <div className="wk-rowhead-code-row">
                        <span className="wk-rowhead-code">{row.code.number}</span>
                        <CopyCodeButton codeNumber={row.code.number} />
                      </div>
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
                  // Period: filled cells drill in; empty working cells add a prefilled entry. The
                  // live-timer cell is read-only in both modes (stop the timer to edit/tick it).
                  const canAdd = isPeriod && isWorkingDay && !filled && !running
                  const clickable = isWorkingDay && !running && (filled || canAdd)
                  // Enter in Timesheet system: every filled, tickable cell shows its checkbox at rest — no hover
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
                    if (isPeriod) {
                      if (filled) {
                        ;(props as PeriodModeProps).onOpenCell(row.key, d.day)
                      } else {
                        ;(props as PeriodModeProps).onAddCell(row.key, d.day)
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
    </>
  )
}
