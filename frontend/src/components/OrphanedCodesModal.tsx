import { useState } from 'react'
import type { OrphanedCode } from '../lib/api'

interface OrphanedCodesModalProps {
  orphaned: OrphanedCode[]
  onRetire: (code: OrphanedCode) => Promise<void>
  onRepoint: (code: OrphanedCode) => void
  onClose: () => void
}

/**
 * What a complete-catalog import just orphaned (BIZ-092).
 *
 * Importing a complete catalog removes reference codes the file omits, but never touches the codes
 * you actually charge to — activating a code copies it, and the time booked to it is real. So a
 * charge line closed in the Timesheet system used to leave a perfectly live code in Walker, still
 * offered in every picker, with nothing on screen saying it was dead.
 *
 * The worst version is a *hidden backing*: a virtual code looks healthy while what it charges to has
 * been locked for months, and the backing is by construction not something you can inspect. Hence
 * naming the dependent virtual codes rather than just the code number.
 *
 * Nothing is decided here. A code can be missing simply because the export was scoped too narrowly —
 * that is a real case, not a hypothetical — so this offers the two remedies and applies neither on
 * its own.
 */
export function OrphanedCodesModal({
  orphaned,
  onRetire,
  onRepoint,
  onClose,
}: OrphanedCodesModalProps) {
  const [busyId, setBusyId] = useState<string | null>(null)

  return (
    <div className="wk-overlay" onClick={onClose}>
      <div
        className="wk-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Codes missing from the imported catalog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="wk-modal-head">
          <span className="wk-modal-title">
            {orphaned.length === 1
              ? '1 of your codes is not in this catalog'
              : `${orphaned.length} of your codes are not in this catalog`}
          </span>
          <button type="button" className="wk-modal-close" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="wk-modal-body">
          <p className="wk-dialog-lead">
            You still charge to these, but the catalog you just imported doesn&apos;t list them —
            usually because the charge line has been closed since your last export.
          </p>

          <ul className="wk-orphan-list">
            {orphaned.map((code) => (
              <li key={code.id} className="wk-orphan">
                <div className="wk-orphan-id">
                  <span className="wk-orphan-name">{code.name}</span>
                  <span className="wk-orphan-number">{code.number}</span>
                </div>

                {code.virtualCodes.length > 0 && (
                  <p className="wk-orphan-virtuals">
                    Charged through by {code.virtualCodes.map((v) => v.name).join(', ')} —
                    repointing fixes {code.virtualCodes.length === 1 ? 'it' : 'them all'} at once.
                  </p>
                )}

                <div className="wk-orphan-actions">
                  {code.virtualCodes.length > 0 && (
                    <button
                      type="button"
                      className="wk-btn-ghost"
                      onClick={() => onRepoint(code)}
                      disabled={busyId !== null}
                    >
                      Repoint to another code…
                    </button>
                  )}
                  <button
                    type="button"
                    className="wk-btn-ghost"
                    disabled={busyId !== null}
                    onClick={() => {
                      setBusyId(code.id)
                      onRetire(code).finally(() => setBusyId(null))
                    }}
                  >
                    Retire it
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <p className="wk-dialog-fine">
            Nothing has been changed. A code can also be missing because the file covered only part
            of your catalog — in that case leave it alone and import a wider export. Either way, the
            time already booked to these codes stays exactly as it is.
          </p>
        </div>

        <div className="wk-modal-foot">
          <button type="button" className="wk-btn wk-btn-primary" onClick={onClose}>
            Later
          </button>
        </div>
      </div>
    </div>
  )
}
