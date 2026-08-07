import { useState } from 'react'
import type { BlockingEntries, TimesheetCode } from '../types'
import { formatDuration, formatHoursMinutes } from '../lib/time'
import { CodePicker } from './CodePicker'
import { InlineDeleteConfirm } from './InlineDeleteConfirm'

interface BlockingEntriesModalProps {
  code: TimesheetCode // the code the user is trying to delete
  codes: TimesheetCode[] // candidates to reassign onto
  blocking: BlockingEntries
  onReassign: (targetCodeId: string, activity: string) => Promise<void>
  onDeleteEntries: () => Promise<void>
  onClose: () => void
}

const formatDay = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00`)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/**
 * The way out of a blocked code deletion (BIZ-088).
 *
 * Deleting a code refuses while Entries point at it — captured time is real, so silently moving or
 * dropping it would be data loss. This says *what* is in the way (how many, over what range, for how
 * long) and offers the two deliberate resolutions: reassign onto another code + activity, or delete.
 *
 * The counts are Organization-wide (the guard is, BIZ-030) but only the user's own entries can be
 * acted on, so entries belonging to another member are reported and then explicitly set aside rather
 * than silently ignored — otherwise a reassign that appears to succeed would leave the code just as
 * undeletable, with nothing on screen explaining why.
 */
export function BlockingEntriesModal({
  code,
  codes,
  blocking,
  onReassign,
  onDeleteEntries,
  onClose,
}: BlockingEntriesModalProps) {
  const [picking, setPicking] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  const canResolve = blocking.own > 0
  const span =
    blocking.firstDate && blocking.lastDate && blocking.firstDate !== blocking.lastDate
      ? `${formatDay(blocking.firstDate)} → ${formatDay(blocking.lastDate)}`
      : blocking.firstDate
        ? formatDay(blocking.firstDate)
        : null

  const run = (action: () => Promise<void>) => {
    setBusy(true)
    action().finally(() => setBusy(false))
  }

  if (picking) {
    return (
      <CodePicker
        title={`Reassign ${blocking.own} ${blocking.own > 1 ? 'entries' : 'entry'} to…`}
        codes={codes.filter((c) => c.id !== code.id)}
        onClose={() => setPicking(false)}
        onPick={(codeId, activity) => {
          setPicking(false)
          // The picker always yields an activity outside code-only mode; the guard is for the type,
          // and for the impossible case it would otherwise send entries to the uncategorized bucket.
          if (activity) run(() => onReassign(codeId, activity))
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
        aria-label={`Entries using ${code.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="wk-modal-head">
          <span className="wk-modal-title">Entries using {code.name}</span>
          <button type="button" className="wk-modal-close" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="wk-modal-body">
          <p className="wk-blocking-summary">
            <strong>
              {blocking.total} {blocking.total > 1 ? 'entries' : 'entry'}
            </strong>{' '}
            {span && <>({span}) </>}
            still point at this code, totalling {formatHoursMinutes(blocking.minutes)}. The code
            cannot be deleted until they are resolved.
          </p>

          {blocking.others > 0 && (
            <p className="wk-blocking-note" role="note">
              {blocking.own === 0 ? 'All of them' : `${blocking.others} of them`} belong to another
              member of your organization, so they cannot be resolved from here.
              {blocking.own === 0 && ' Ask them to reassign or remove their entries.'}
            </p>
          )}

          {blocking.entries.length > 0 && (
            <ul className="wk-blocking-list">
              {blocking.entries.map((e) => (
                <li key={e.id} className="wk-blocking-item">
                  <span className="wk-blocking-date">{formatDay(e.date)}</span>
                  <span className="wk-blocking-dur">
                    {e.end === null ? 'running' : formatDuration(e.end - e.start)}
                  </span>
                  <span className="wk-blocking-desc">
                    {e.description || e.activity || 'No description'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {canResolve && (
          <div className="wk-modal-foot">
            {confirmingDelete ? (
              <InlineDeleteConfirm
                prompt={`Delete ${blocking.own} ${blocking.own > 1 ? 'entries' : 'entry'} (${formatHoursMinutes(blocking.minutes)})? This cannot be undone.`}
                confirmLabel="Delete"
                testid="wk-blocking-delete"
                onCancel={() => setConfirmingDelete(false)}
                onConfirm={() => {
                  setConfirmingDelete(false)
                  run(onDeleteEntries)
                }}
              />
            ) : (
              <>
                <button
                  type="button"
                  className="wk-btn-ghost"
                  disabled={busy}
                  onClick={() => setConfirmingDelete(true)}
                >
                  Delete these entries
                </button>
                <button
                  type="button"
                  className="wk-btn wk-btn-primary"
                  disabled={busy}
                  onClick={() => setPicking(true)}
                >
                  Reassign to another code…
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
