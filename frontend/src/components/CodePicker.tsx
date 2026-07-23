import { useEffect, useMemo, useState } from 'react'
import type { ActivityName, ReferenceCode, TimesheetCode } from '../types'
import { searchUserCodes, sortReferenceByName } from '../lib/codeSearch'

interface CodePickerProps {
  title: string // "Switch task" | "Categorize entry"
  codes: TimesheetCode[]
  // In code-only mode `activity` is omitted — a single click picks the code (BIZ-037, for Tasks,
  // which have no activity). Otherwise an activity must be chosen and is always passed.
  onPick: (codeId: string, activity?: ActivityName) => void
  onClose: () => void
  codeOnly?: boolean // pick a code without an activity (BIZ-037)
  realOnly?: boolean // Tier 1 = real codes only (virtual-code backing selector, BIZ-049)
  onCreateNew?: (query: string) => void // create a real code on the fly when nothing matches
  onCreateNewVirtual?: (query: string) => void // create a virtual code on the fly (BIZ-013)
  onSearchReference?: (q: string) => Promise<ReferenceCode[]> // find codes in the general catalog
  // Activate a reference-catalog (Tier 2) code — routes through the code editor so the newly
  // activated real code gets a deliberate colour (BIZ-049).
  onActivateReference?: (ref: ReferenceCode) => void
}

/** Modal chooser for a Timesheet code (+ Activity). Tiered search: your codes, then the reference catalog. */
export function CodePicker({
  title,
  codes,
  onPick,
  onClose,
  onCreateNew,
  onCreateNewVirtual,
  onSearchReference,
  onActivateReference,
  codeOnly = false,
  realOnly = false,
}: CodePickerProps) {
  const [query, setQuery] = useState('')

  // Tier 1 — the user's codes, name-sorted (BIZ-049).
  const results = useMemo(
    () => searchUserCodes(codes, query, { codeOnly, realOnly }),
    [codes, query, codeOnly, realOnly],
  )

  // Keep the picker snappy on large catalogs: render a capped slice, type to narrow.
  const CAP = 200
  const shown = results.slice(0, CAP)

  // Tier 2 — the reference catalog, for codes not yet in the active set (activate on the fly).
  const activeNumbers = new Set(codes.map((c) => c.number))
  const [refResults, setRefResults] = useState<ReferenceCode[]>([])
  useEffect(() => {
    const q = query.trim()
    if (!q || !onSearchReference) {
      setRefResults([])
      return
    }
    let cancelled = false
    const timer = setTimeout(() => {
      onSearchReference(q)
        .then((r) => !cancelled && setRefResults(r))
        .catch(() => !cancelled && setRefResults([]))
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, onSearchReference])
  const refToAdd = sortReferenceByName(refResults, activeNumbers)

  return (
    <div className="wk-overlay" onClick={onClose}>
      <div className="wk-modal wk-modal--picker" onClick={(e) => e.stopPropagation()}>
        <div className="wk-modal-head">
          <span className="wk-modal-title">{title}</span>
          <button type="button" className="wk-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="wk-modal-search-wrap">
          <input
            className="wk-input"
            autoFocus
            value={query}
            placeholder="Search code or activity…"
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="wk-modal-body">
          {shown.length > 0 && <div className="wk-suggest-title">Your codes</div>}
          {shown.map(({ code, activities }) => {
            const head = (
              <div className="wk-picker-code-head">
                <span className="wk-dot" style={{ background: code.color }} />
                <span>
                  <span className="wk-picker-name">
                    {code.name}
                    {code.isVirtual && (
                      <span
                        className="wk-act-chip"
                        style={{ marginLeft: 8, fontSize: 11, verticalAlign: 'middle' }}
                      >
                        virtual
                      </span>
                    )}
                  </span>
                  <span className="wk-picker-meta">
                    {code.number} · {code.label}
                  </span>
                </span>
              </div>
            )

            // Code-only: the whole row is the pick target (no activity to choose).
            if (codeOnly) {
              return (
                <button
                  key={code.id}
                  type="button"
                  className="wk-picker-code wk-picker-code-pick"
                  onClick={() => onPick(code.id)}
                >
                  {head}
                </button>
              )
            }

            return (
              <div key={code.id} className="wk-picker-code">
                {head}
                <div className="wk-picker-acts">
                  {activities.map((a) => (
                    <button
                      key={a.code || a.label}
                      type="button"
                      className="wk-act"
                      onClick={() => onPick(code.id, a.label)}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
          {results.length > shown.length && (
            <div className="wk-modal-empty">
              Showing {shown.length} of {results.length} — type to search.
            </div>
          )}

          {onActivateReference && query.trim() && refToAdd.length > 0 && (
            <div style={{ borderTop: '1px solid var(--wk-line)', marginTop: 8, paddingTop: 10 }}>
              <div className="wk-suggest-title">
                From your reference catalog — add to your codes
              </div>
              {refToAdd.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="wk-suggest-item"
                  onClick={() => onActivateReference(r)}
                >
                  <span className="wk-suggest-body">
                    <span className="wk-suggest-desc">{r.name}</span>
                    <span className="wk-suggest-meta">
                      {r.number} · {r.label}
                    </span>
                  </span>
                  <span className="wk-suggest-key">+ add</span>
                </button>
              ))}
            </div>
          )}

          {results.length === 0 && refToAdd.length === 0 && (
            <div className="wk-modal-empty">
              No codes match.
              {query.trim() && (onCreateNew || onCreateNewVirtual) && (
                <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
                  {onCreateNew && (
                    <button
                      type="button"
                      className="wk-btn-ghost"
                      onClick={() => onCreateNew(query.trim())}
                    >
                      ➕ Create a new code
                    </button>
                  )}
                  {onCreateNewVirtual && (
                    <button
                      type="button"
                      className="wk-btn-ghost"
                      onClick={() => onCreateNewVirtual(query.trim())}
                    >
                      ➕ Create a new virtual code
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
