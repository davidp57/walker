import type { MouseEvent } from 'react'
import { useState } from 'react'
import type { DayColumn, PeriodRow } from '../types'
import { checklistKey } from '../types'
import { formatDuration } from '../lib/time'
import { roundQuarterHourCarry } from '../lib/rounding'

/**
 * BIZ-063: per-day-column quarter-hour rounding for the Enter view. Error-carry runs over each day's
 * cells in row order, so the day total stays closest to the real total. Keyed by `checklistKey`.
 */
function buildRoundedMap(days: DayColumn[], rows: PeriodRow[]): Record<string, number> {
  const map: Record<string, number> = {}
  for (const d of days) {
    const rounded = roundQuarterHourCarry(rows.map((r) => r.minutesByDay[d.day] || 0))
    rows.forEach((r, i) => {
      map[checklistKey(r.key, d.day)] = rounded[i]
    })
  }
  return map
}

/** Displayed minutes for a cell: the rounded value when rounding is on, else the real minutes. */
function shownMinutes(
  rounded: Record<string, number> | undefined,
  rowKey: string,
  day: number,
  real: number,
): number {
  return rounded ? (rounded[checklistKey(rowKey, day)] ?? 0) : real
}

interface BaseProps {
  days: DayColumn[]
  rows: PeriodRow[]
}

interface PeriodModeProps extends BaseProps {
  mode: 'period'
  // BIZ-070: per-day minutes tracked but off the matrix (missing a code or activity). Shown as an
  // "Uncategorized" footer row so the matrix total + this reconciles to the captured (tracked) total.
  uncategorizedByDay?: Record<number, number>
  runningCell: { key: string; day: number } | null // the live timer's cell — tinted, read-only
  onOpenCell: (rowKey: string, day: number) => void
  onAddCell: (rowKey: string, day: number) => void // click an empty working cell → new entry, prefilled
  onAddDay: (day: number) => void // BIZ-066: per-column Add → new entry prefilled with that day's date
}

/** BIZ-066: the per-day-column "+" Add shown on working days in Review mode (today primary). */
function DayAddButton({ d, onAddDay }: { d: DayColumn; onAddDay: (day: number) => void }) {
  if (d.isWeekend || d.isAbsence) return null
  return (
    <button
      type="button"
      className={`wk-period-add is-quiet${d.isToday ? ' is-today' : ''}`}
      data-testid={`wk-period-add-${d.day}`}
      title="Add an entry on this day"
      onClick={(e) => {
        e.stopPropagation()
        onAddDay(d.day)
      }}
    >
      +
    </button>
  )
}

interface ChecklistModeProps extends BaseProps {
  mode: 'checklist'
  checked: Record<string, boolean>
  runningCell: { key: string; day: number } | null // the live timer's cell — tinted, read-only, not tickable
  onToggleCell: (rowKey: string, day: number, mods: { shift: boolean; meta: boolean }) => void
  onToggleRow: (rowKey: string) => void
  rounding?: boolean // BIZ-063: show quarter-hour-rounded durations (real value greyed beside)
}

type PeriodGridProps = PeriodModeProps | ChecklistModeProps
/** Internal render props: the union plus the precomputed rounded map when rounding is on. */
type GridRenderProps = PeriodGridProps & { roundedByKey?: Record<string, number> }

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
function DayCardLine({ row, d, props }: { row: PeriodRow; d: DayColumn; props: GridRenderProps }) {
  const { mode } = props
  const real = row.minutesByDay[d.day] || 0
  const minutes = shownMinutes(props.roundedByKey, row.key, d.day, real)
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
      <div className="wk-daycard-line-dur">
        {formatDuration(minutes)}
        {props.roundedByKey && minutes !== real && (
          <span className="wk-dur-real">{formatDuration(real)}</span>
        )}
        {real > 0 && row.manualByDay?.[d.day] && (
          <span className="wk-manual-mark" title="Contains manually-added time">
            ✎
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Phone-portrait rendering of the same grid data: one card per day (instead of one column per
 * day), each listing that day's filled code/activity/duration lines. Rendered unconditionally
 * alongside the table — CSS (`@media (max-width: 640px)`) toggles which one is visible, so no JS
 * breakpoint state is needed. See BIZ-034.
 */
function DayCards(props: GridRenderProps) {
  const { days, rows, roundedByKey } = props

  const colTotal = (day: number) =>
    rows.reduce(
      (sum, r) => sum + shownMinutes(roundedByKey, r.key, day, r.minutesByDay[day] || 0),
      0,
    )
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
              {props.mode === 'period' && (
                <DayAddButton d={d} onAddDay={(props as PeriodModeProps).onAddDay} />
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
      {props.mode === 'period' &&
        (() => {
          // BIZ-070: tracked-but-off-matrix minutes, shown so the mobile total isn't misleading.
          const uncatTotal = Object.values(props.uncategorizedByDay ?? {}).reduce(
            (s, m) => s + m,
            0,
          )
          if (uncatTotal === 0) return null
          return (
            <div
              className="wk-daycards-grandtotal wk-uncat"
              title="Tracked but missing a code or activity, so it isn’t on the matrix."
            >
              <span>⚑ Uncategorized</span>
              <span>{formatDuration(uncatTotal)}</span>
            </div>
          )
        })()}
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

  // BIZ-063: rounding is opt-in and Enter-mode only; precompute the per-cell rounded map once.
  const rounding = mode === 'checklist' && props.rounding === true
  const roundedByKey = rounding ? buildRoundedMap(days, rows) : undefined
  const renderProps: GridRenderProps = { ...props, roundedByKey }

  // Column (daily) totals + grand total for the Timesheet period footer — over displayed minutes.
  const colTotal = (day: number) =>
    rows.reduce(
      (sum, r) => sum + shownMinutes(roundedByKey, r.key, day, r.minutesByDay[day] || 0),
      0,
    )
  const grandTotal = days.reduce(
    (sum, d) => (d.isWeekend || d.isAbsence ? sum : sum + colTotal(d.day)),
    0,
  )

  // BIZ-070: tracked-but-off-matrix minutes (Review only), surfaced so the gap to the captured total
  // is explicit instead of silent.
  const uncatByDay = isPeriod ? ((props as PeriodModeProps).uncategorizedByDay ?? {}) : {}
  const uncatTotal = Object.values(uncatByDay).reduce((s, m) => s + m, 0)
  const uncatTitle =
    'Tracked but missing a code or activity, so it isn’t on the matrix. Add a code and activity to include it.'

  // Real (unrounded) totals — the daily-total row keeps the real value beside the rounded one, unlike
  // cells (which move the real value into a tooltip). BIZ-063.
  const colTotalReal = (day: number) => rows.reduce((sum, r) => sum + (r.minutesByDay[day] || 0), 0)
  const grandTotalReal = days.reduce(
    (sum, d) => (d.isWeekend || d.isAbsence ? sum : sum + colTotalReal(d.day)),
    0,
  )
  // The daily-total row, rendered at both the top and the bottom of the grid.
  const dailyTotalRow = (place: 'top' | 'bottom') => (
    <tr className={place === 'top' ? 'wk-totals-top' : undefined}>
      <td className="wk-foot-label">Daily total</td>
      {days.map((d) => {
        const t = colTotal(d.day)
        const real = colTotalReal(d.day)
        const show = !d.isWeekend && !d.isAbsence && t > 0
        return (
          <td key={d.day} className={`wk-coltotal${d.isWeekend ? ' is-weekend' : ''}`}>
            {show ? formatDuration(t) : ''}
            {show && roundedByKey && t !== real && (
              <span className="wk-dur-real">{formatDuration(real)}</span>
            )}
          </td>
        )
      })}
      <td className="wk-grandtotal">
        {formatDuration(grandTotal)}
        {roundedByKey && grandTotal !== grandTotalReal && (
          <span className="wk-dur-real">{formatDuration(grandTotalReal)}</span>
        )}
      </td>
    </tr>
  )

  return (
    <>
      <DayCards {...renderProps} />
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
                {isPeriod && <DayAddButton d={d} onAddDay={(props as PeriodModeProps).onAddDay} />}
              </th>
            ))}
            <th className="wk-total-h">Total</th>
          </tr>
          {dailyTotalRow('top')}
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
            const rowTotal = fillDays.reduce(
              (s, d) =>
                s + shownMinutes(roundedByKey, row.key, d.day, row.minutesByDay[d.day] || 0),
              0,
            )

            return (
              <tr key={row.key}>
                <td className="wk-rowhead">
                  <div className="wk-rowhead-inner">
                    <span className="wk-dot" style={{ background: row.code.color }} />
                    <div className="wk-rowhead-body">
                      <div className="wk-rowhead-label-row">
                        <span className="wk-rowhead-label" title={row.code.name}>
                          {row.code.name}
                        </span>
                        {/* The code number (N9/…) is only ever copied, never read — so it isn't shown;
                            the copy button (revealed on row hover) carries it. */}
                        <CopyCodeButton codeNumber={row.code.number} />
                      </div>
                      {row.activity !== row.code.name && (
                        <div className="wk-rowhead-act">{row.activity}</div>
                      )}
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
                  const shown = shownMinutes(roundedByKey, row.key, d.day, minutes)
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
                          aria-label={`Mark ${formatDuration(shown)} as entered`}
                        />
                      )}
                      <span>{filled || running ? formatDuration(shown) : ''}</span>
                      {roundedByKey && filled && shown !== minutes && (
                        <span className="wk-dur-real">{formatDuration(minutes)}</span>
                      )}
                      {filled && row.manualByDay?.[d.day] && (
                        <span className="wk-manual-mark" title="Contains manually-added time">
                          ✎
                        </span>
                      )}
                      {running && <span className="wk-cell-live" />}
                      {canAdd && <span className="wk-cell-add">+</span>}
                    </td>
                  )
                })}

                <td className="wk-rowtotal">{formatDuration(rowTotal)}</td>
              </tr>
            )
          })}
          {/* Empty period: keep the matrix shape with a few muted placeholder rows rather than
              collapsing to a bare header + footer. */}
          {rows.length === 0 &&
            [96, 72, 112, 84, 104].map((w, i) => (
              <tr key={`ghost-${i}`} className="wk-row-ghost" aria-hidden="true">
                <td className="wk-rowhead">
                  <div className="wk-rowhead-inner">
                    <span className="wk-dot" />
                    <span className="wk-ghost-bar" style={{ width: w }} />
                  </div>
                </td>
                {days.map((d) => (
                  <td
                    key={d.day}
                    className={`wk-cell${d.isWeekend ? ' is-weekend' : ''}${d.isAbsence ? ' is-absence' : ''}`}
                  />
                ))}
                <td className="wk-rowtotal" />
              </tr>
            ))}
        </tbody>

        <tfoot>
          {dailyTotalRow('bottom')}
          {isPeriod && uncatTotal > 0 && (
            <tr className="wk-foot-uncat" title={uncatTitle}>
              <td className="wk-foot-label wk-uncat">⚑ Uncategorized</td>
              {days.map((d) => {
                const u = uncatByDay[d.day] || 0
                return (
                  <td key={d.day} className="wk-coltotal wk-uncat">
                    {u > 0 ? formatDuration(u) : ''}
                  </td>
                )
              })}
              <td className="wk-grandtotal wk-uncat">{formatDuration(uncatTotal)}</td>
            </tr>
          )}
        </tfoot>
      </table>
    </>
  )
}
