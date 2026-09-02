import { useState } from 'react'

interface ImportCatalogModalProps {
  fileName: string // the file already chosen in the OS picker
  onImport: (completeCatalog: boolean) => Promise<void>
  onClose: () => void
}

/**
 * Confirming a reference-catalog import (TEC-019).
 *
 * The import is an upsert by code number and never removes anything, which is right for a scoped
 * extract and wrong for a full export: a charge code closed since the previous import stays in the
 * catalog for ever and keeps being suggested, struck through in the Timesheet system but perfectly
 * live here.
 *
 * Declaring the file complete is therefore a real decision, not a preference, and it is destructive
 * in one direction only — reference codes vanish, active codes and their Entries never do. It is
 * off by default because getting it wrong on a partial file empties the catalog.
 */
export function ImportCatalogModal({ fileName, onImport, onClose }: ImportCatalogModalProps) {
  const [complete, setComplete] = useState(false)
  const [busy, setBusy] = useState(false)

  return (
    <div className="wk-overlay" onClick={onClose}>
      <div
        className="wk-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Import the code catalog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="wk-modal-head">
          <span className="wk-modal-title">Import {fileName}</span>
          <button type="button" className="wk-modal-close" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="wk-modal-body">
          <p className="wk-dialog-lead">
            Codes are matched by number: the ones already in your reference catalog are refreshed,
            the new ones are added. Your active codes are not changed.
          </p>

          <label className="wk-dialog-choice">
            <input
              type="checkbox"
              checked={complete}
              onChange={(e) => setComplete(e.target.checked)}
            />
            <span>
              This file is my complete catalog — remove reference codes it doesn&apos;t contain
            </span>
          </label>

          {complete && (
            <p className="wk-dialog-fine">
              That is how a code closed since your last export stops being suggested. Only the
              reference catalog is pruned — active codes and the time booked to them stay. Leave it
              unticked if the file covers just part of your catalog, or it will empty the rest.
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
            disabled={busy}
            onClick={() => {
              setBusy(true)
              onImport(complete).finally(() => setBusy(false))
            }}
          >
            Import
          </button>
        </div>
      </div>
    </div>
  )
}
