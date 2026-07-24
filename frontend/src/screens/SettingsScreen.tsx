import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { Absence, Density, PeriodScheme, Theme } from '../types'

interface SettingsScreenProps {
  workdays: boolean[] // index by JS getDay(): 0=Sun … 6=Sat
  onToggleWorkday: (dayIndex: number) => void
  density: Density
  onDensityChange: (density: Density) => void
  periodScheme: PeriodScheme
  onPeriodSchemeChange: (scheme: PeriodScheme) => void
  theme: Theme
  onThemeChange: (theme: Theme) => void
  absences: Absence[] // manually managed in the POC
  onAddAbsence: (date: string, reason: string, end?: string | null) => void
  onRemoveAbsence: (date: string) => void
}

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] // Mon … Sun
const DAY_LABELS: Record<number, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  0: 'Sun',
}

const DENSITY_OPTIONS: { value: Density; label: string }[] = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact', label: 'Compact' },
]

const PERIOD_SCHEME_OPTIONS: { value: PeriodScheme; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'semi_monthly', label: 'Semi-monthly' },
  { value: 'monthly', label: 'Monthly' },
]

/**
 * A single-select segmented control exposed to assistive tech as a proper radiogroup: each option is
 * a `radio` with `aria-checked`, the group carries a label, and Arrow keys move the selection with a
 * roving tab stop (WAI-ARIA radiogroup pattern) — the visual `.wk-seg` styling is unchanged.
 */
function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  const index = options.findIndex((o) => o.value === value)
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const delta =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? -1
          : 0
    if (delta === 0) return
    e.preventDefault()
    onChange(options[(index + delta + options.length) % options.length].value)
  }
  return (
    <div className="wk-period" role="radiogroup" aria-label={label} onKeyDown={onKeyDown}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            className={`wk-seg${active ? ' is-active' : ''}`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
]

const formatDate = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00`)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function SettingsScreen({
  workdays,
  onToggleWorkday,
  density,
  onDensityChange,
  periodScheme,
  onPeriodSchemeChange,
  theme,
  onThemeChange,
  absences,
  onAddAbsence,
  onRemoveAbsence,
}: SettingsScreenProps) {
  const [newDate, setNewDate] = useState('')
  const [newEndDate, setNewEndDate] = useState('')
  const [newReason, setNewReason] = useState('')

  const addAbsence = () => {
    if (!newDate) return
    // An empty or earlier "to" means a single day; otherwise add the whole range (BIZ-039).
    const end = newEndDate && newEndDate >= newDate ? newEndDate : null
    onAddAbsence(newDate, newReason.trim() || 'Absence', end)
    setNewDate('')
    setNewEndDate('')
    setNewReason('')
  }

  // Settings save optimistically (fire-and-forget) — flash a transient "Saved" beside the control
  // just changed so the action isn't silent. `savedKey` names the control; it self-clears.
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const savedTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(savedTimer.current), [])
  const markSaved = (key: string) => {
    setSavedKey(key)
    window.clearTimeout(savedTimer.current)
    savedTimer.current = window.setTimeout(() => setSavedKey(null), 1600)
  }
  const savedTick = (key: string) =>
    savedKey === key ? (
      <span className="wk-saved-tick" role="status">
        ✓ Saved
      </span>
    ) : null

  return (
    <div className="wk-screen" style={{ maxWidth: 720 }}>
      <h1 className="wk-screen-title" style={{ margin: '0 0 5px' }}>
        Settings
      </h1>
      <div className="wk-screen-sub" style={{ marginBottom: 22 }}>
        Personalize how the Timesheet period view reads.
      </div>

      <div className="wk-set-list">
        <div className="wk-set-card">
          <div className="wk-set-cardhead">
            <h2 className="wk-set-title">Work rhythm</h2>
            {savedTick('rhythm')}
          </div>
          <div className="wk-set-desc" style={{ marginBottom: 12 }}>
            Which days count as workdays. Un-ticked days are greyed in the grid (also covers
            part-time).
          </div>
          <div
            role="group"
            aria-label="Workdays"
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
          >
            {DAY_ORDER.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={workdays[d]}
                className={`wk-daytoggle${workdays[d] ? ' is-on' : ''}`}
                onClick={() => {
                  onToggleWorkday(d)
                  markSaved('rhythm')
                }}
              >
                {DAY_LABELS[d]}
              </button>
            ))}
          </div>
        </div>

        <div className="wk-set-card is-row">
          <div>
            <h2 className="wk-set-title">Density</h2>
            <div className="wk-set-desc">Row height across the app.</div>
          </div>
          <div className="wk-set-control">
            {savedTick('density')}
            <SegmentedControl
              label="Density"
              options={DENSITY_OPTIONS}
              value={density}
              onChange={(v) => {
                onDensityChange(v)
                markSaved('density')
              }}
            />
          </div>
        </div>

        <div className="wk-set-card is-row">
          <div>
            <h2 className="wk-set-title">Timesheet period scheme</h2>
            <div className="wk-set-desc">
              How the Timesheet period view splits the calendar. Changing it reshapes your period
              view right away.
            </div>
          </div>
          <div className="wk-set-control">
            {savedTick('period')}
            <SegmentedControl
              label="Timesheet period scheme"
              options={PERIOD_SCHEME_OPTIONS}
              value={periodScheme}
              onChange={(v) => {
                onPeriodSchemeChange(v)
                markSaved('period')
              }}
            />
          </div>
        </div>

        <div className="wk-set-card is-row">
          <div>
            <h2 className="wk-set-title">Theme</h2>
            <div className="wk-set-desc">Dark, light, or match your system's appearance.</div>
          </div>
          <div className="wk-set-control">
            {savedTick('theme')}
            <SegmentedControl
              label="Theme"
              options={THEME_OPTIONS}
              value={theme}
              onChange={(v) => {
                onThemeChange(v)
                markSaved('theme')
              }}
            />
          </div>
        </div>

        <div className="wk-set-card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <h2 className="wk-set-title">Absences</h2>
            <span
              style={{
                fontFamily: 'var(--wk-font-mono)',
                fontSize: 11,
                color: 'var(--wk-text-lo)',
              }}
            >
              manual for now — will reflect from the Timesheet system later
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {absences.map((a) => (
              <div key={a.date} className="wk-absence-chip">
                <span className="wk-absence-swatch" />
                <span style={{ flex: 1 }}>
                  {formatDate(a.date)} · {a.reason}
                </span>
                <button
                  type="button"
                  className="wk-btn-icon"
                  title="Remove absence"
                  style={{ padding: '4px 9px' }}
                  onClick={() => onRemoveAbsence(a.date)}
                >
                  ✕
                </button>
              </div>
            ))}
            {absences.length === 0 && (
              <div
                style={{
                  color: 'var(--wk-text-lo)',
                  fontFamily: 'var(--wk-font-mono)',
                  fontSize: 12,
                }}
              >
                No absences yet.
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="wk-input"
              type="date"
              value={newDate}
              style={{ width: 150 }}
              aria-label="Absence start date"
              onChange={(e) => setNewDate(e.target.value)}
            />
            <span className="wk-screen-sub">to</span>
            <input
              className="wk-input"
              type="date"
              value={newEndDate}
              min={newDate || undefined}
              style={{ width: 150 }}
              aria-label="Absence end date (optional)"
              title="Optional — leave empty for a single day"
              onChange={(e) => setNewEndDate(e.target.value)}
            />
            <input
              className="wk-input"
              value={newReason}
              placeholder="Annual leave"
              style={{ flex: 1 }}
              onChange={(e) => setNewReason(e.target.value)}
            />
            <button type="button" className="wk-btn-ghost" onClick={addAbsence}>
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
