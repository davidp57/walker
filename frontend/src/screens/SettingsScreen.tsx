import { useState } from 'react'
import type { Absence, Density, PeriodScheme } from '../types'

interface SettingsScreenProps {
  workdays: boolean[] // index by JS getDay(): 0=Sun … 6=Sat
  onToggleWorkday: (dayIndex: number) => void
  density: Density
  onDensityChange: (density: Density) => void
  periodScheme: PeriodScheme
  onPeriodSchemeChange: (scheme: PeriodScheme) => void
  absences: Absence[] // manually managed in the POC
  onAddAbsence: (date: string, reason: string) => void
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

const PERIOD_SCHEME_OPTIONS: { value: PeriodScheme; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'semi_monthly', label: 'Semi-monthly' },
  { value: 'monthly', label: 'Monthly' },
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
  absences,
  onAddAbsence,
  onRemoveAbsence,
}: SettingsScreenProps) {
  const [newDate, setNewDate] = useState('')
  const [newReason, setNewReason] = useState('')

  const addAbsence = () => {
    if (!newDate) return
    onAddAbsence(newDate, newReason.trim() || 'Absence')
    setNewDate('')
    setNewReason('')
  }

  return (
    <div className="wk-screen" style={{ maxWidth: 720 }}>
      <div className="wk-screen-title" style={{ marginBottom: 5 }}>
        Settings
      </div>
      <div className="wk-screen-sub" style={{ marginBottom: 22 }}>
        Personalize how the Timesheet period view reads.
      </div>

      <div className="wk-set-list">
        <div className="wk-set-card">
          <div className="wk-set-title">Work rhythm</div>
          <div className="wk-set-desc" style={{ marginBottom: 12 }}>
            Which days count as workdays. Un-ticked days are greyed in the grid (also covers
            part-time).
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {DAY_ORDER.map((d) => (
              <button
                key={d}
                type="button"
                className={`wk-daytoggle${workdays[d] ? ' is-on' : ''}`}
                onClick={() => onToggleWorkday(d)}
              >
                {DAY_LABELS[d]}
              </button>
            ))}
          </div>
        </div>

        <div className="wk-set-card is-row">
          <div>
            <div className="wk-set-title">Density</div>
            <div className="wk-set-desc">Row height across the app.</div>
          </div>
          <div className="wk-period">
            <button
              type="button"
              className={`wk-seg${density === 'comfortable' ? ' is-active' : ''}`}
              onClick={() => onDensityChange('comfortable')}
            >
              Comfortable
            </button>
            <button
              type="button"
              className={`wk-seg${density === 'compact' ? ' is-active' : ''}`}
              onClick={() => onDensityChange('compact')}
            >
              Compact
            </button>
          </div>
        </div>

        <div className="wk-set-card is-row">
          <div>
            <div className="wk-set-title">Timesheet period scheme</div>
            <div className="wk-set-desc">
              How the Timesheet period view splits the calendar (ADR-0009).
            </div>
          </div>
          <div className="wk-period">
            {PERIOD_SCHEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`wk-seg${periodScheme === option.value ? ' is-active' : ''}`}
                onClick={() => onPeriodSchemeChange(option.value)}
              >
                {option.label}
              </button>
            ))}
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
            <div className="wk-set-title">Absences</div>
            <span
              style={{
                fontFamily: 'var(--wk-font-mono)',
                fontSize: 11,
                color: 'var(--wk-text-lo)',
              }}
            >
              manual for now — will reflect from T&amp;E later
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
              style={{ width: 170 }}
              onChange={(e) => setNewDate(e.target.value)}
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
