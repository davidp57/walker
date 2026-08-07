import { useState } from 'react'
import type { CodeSweep } from '../lib/api'
import type { TimesheetCode } from '../types'
import { CodePicker } from './CodePicker'

interface RetireCodeModalProps {
  code: TimesheetCode // the code being retired
  codes: TimesheetCode[] // candidates for the replacement
  periodStart: string // the open Timesheet period's bounds (ADR-0009) — the sweep's window
  periodEnd: string
  onRetire: (sweep?: CodeSweep) => Promise<void>
  onClose: () => void
}

const formatDay = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00`)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/**
 * Retiring a code (BIZ-090).
 *
 * A closed charge line cannot simply be deleted — its Entries are real captured time, which is why
 * `delete_code` refuses (BIZ-088). Retiring stops the code being offered without touching what it
 * already carries.
 *
 * The sweep is **opt-in and bounded to the open Timesheet period**. Earlier periods have already been
 * keyed into the Timesheet system, so rewriting them would put Walker permanently out of step with
 * what was actually declared — the open period is the only one where moving entries is a correction
 * rather than a falsification. The window is spelled out on screen rather than implied.
 */
export function RetireCodeModal({
  code,
  codes,
  periodStart,
  periodEnd,
  onRetire,
  onClose,
}: RetireCodeModalProps) {
  const [sweeping, setSweeping] = useState(false)
  const [picking, setPicking] = useState(false)
  const [target, setTarget] = useState<{ code: TimesheetCode; activity: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const ready = !sweeping || target !== null

  if (picking) {
    return (
      <CodePicker
        title="Move this period's entries to…"
        // Never the code being retired: moving entries onto it would defeat the whole action.
        codes={codes.filter((c) => c.id !== code.id && !c.obsolete)}
        onClose={() => setPicking(false)}
        onPick={(codeId, activity) => {
          const picked = codes.find((c) => c.id === codeId)
          if (picked && activity) setTarget({ code: picked, activity })
          setPicking(false)
        }}
      />
    )
  }

  return (
    <div className="wk-overlay" onClick={onClose}>
      <div
        className="wk-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Retire ${code.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="wk-modal-head">
          <span className="wk-modal-title">
            <span className="wk-dot" style={{ background: code.color }} /> Retire {code.name}
          </span>
          <button type="button" className="wk-modal-close" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="wk-modal-body">
          <p className="wk-retire-lead">
            It disappears from your catalog and from every code picker. Time already booked to it
            stays exactly as it is — this is not a deletion.
          </p>

          {/* Real codes are shared by the whole Organization (BIZ-030, ADR-0010), so this is not a
              personal preference and must not look like one. Virtual codes are per-user. */}
          {!code.isVirtual && (
            <p className="wk-retire-note" role="note">
              {code.number} is a shared code — retiring it hides it for everyone in your
              organization.
            </p>
          )}

          <label className="wk-retire-sweep">
            <input
              type="checkbox"
              checked={sweeping}
              onChange={(e) => setSweeping(e.target.checked)}
            />
            <span>
              Move this period&apos;s entries ({formatDay(periodStart)} → {formatDay(periodEnd)}) to
              another code
            </span>
          </label>

          {sweeping && (
            <div className="wk-retire-target">
              <button type="button" className="wk-btn-ghost" onClick={() => setPicking(true)}>
                {target ? 'Change the replacement…' : 'Choose a replacement…'}
              </button>
              {target && (
                <span className="wk-retire-chosen">
                  <span className="wk-dot" style={{ background: target.code.color }} />
                  {target.code.name} · {target.activity}
                </span>
              )}
            </div>
          )}

          {sweeping && (
            <p className="wk-retire-scope">
              Earlier periods are left untouched: they have already been keyed into the Timesheet
              system, so their entries stay on {code.number}.
            </p>
          )}
        </div>

        <div className="wk-modal-foot">
          <button type="button" className="wk-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="wk-btn wk-btn-primary"
            disabled={!ready || busy}
            onClick={() => {
              setBusy(true)
              onRetire(
                sweeping && target
                  ? {
                      targetCodeId: target.code.id,
                      activity: target.activity,
                      start: periodStart,
                      end: periodEnd,
                    }
                  : undefined,
              ).finally(() => setBusy(false))
            }}
          >
            Retire this code
          </button>
        </div>
      </div>
    </div>
  )
}
