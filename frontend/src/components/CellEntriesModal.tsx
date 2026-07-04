import type { Entry, TimesheetCode } from '../types'
import { EntryRow } from './EntryRow'

interface CellEntriesModalProps {
  title: string // "N9/1042 · Bug fixing · Fri, Jul 3"
  entries: Entry[]
  codesById: Record<string, TimesheetCode>
  onEditEntry: (id: string, patch: Partial<Entry>) => void
  onCategorizeEntry: (id: string) => void
  onOpenEntry: (id: string) => void
  onResumeEntry: (id: string) => void
  onDeleteEntry: (id: string) => void
  onClose: () => void
}

/** Drill-down of the entries behind one Timesheet period grid cell — edit/delete each in place. */
export function CellEntriesModal({
  title,
  entries,
  codesById,
  onEditEntry,
  onCategorizeEntry,
  onOpenEntry,
  onResumeEntry,
  onDeleteEntry,
  onClose,
}: CellEntriesModalProps) {
  return (
    <div className="wk-overlay" onClick={onClose}>
      <div
        className="wk-modal wk-entry-cols"
        style={{ width: 'min(920px, 94vw)', maxWidth: 'none' }}
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="wk-modal-head">
          <span className="wk-modal-title">{title}</span>
          <button type="button" className="wk-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={{ padding: '12px 16px' }}>
          {entries.length === 0 ? (
            <div className="wk-modal-empty">No entries behind this cell.</div>
          ) : (
            <div className="wk-entry-list">
              {entries.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  code={entry.codeId ? (codesById[entry.codeId] ?? null) : null}
                  onEdit={(patch) => onEditEntry(entry.id, patch)}
                  onCategorize={() => onCategorizeEntry(entry.id)}
                  onOpenEditor={() => onOpenEntry(entry.id)}
                  onResume={() => onResumeEntry(entry.id)}
                  onDelete={() => onDeleteEntry(entry.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
