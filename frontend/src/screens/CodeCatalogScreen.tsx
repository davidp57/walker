import { useEffect, useState } from 'react'
import type { ReferenceCode, TimesheetCode } from '../types'
import { searchUserCodes, sortReferenceByName } from '../lib/codeSearch'
import { DOCS_SITE_URL } from '../lib/links'

interface CodeCatalogScreenProps {
  codes: TimesheetCode[]
  /** True until the first codes response has arrived — avoids flashing the empty state. */
  loading?: boolean
  onNew: () => void
  onNewVirtual: () => void
  onEdit: (code: TimesheetCode) => void
  onEditVirtual: (code: TimesheetCode) => void
  onDelete: (code: TimesheetCode) => void
  isCodeInUse: (id: string) => boolean
  onImport?: () => void // import the reference catalog from a file
  importStatus?: string | null // result/error of the last import
  onSearchReference: (q: string) => Promise<ReferenceCode[]>
  // Activate a reference code through the code editor so it gets a deliberate colour (BIZ-049).
  onActivateReference: (ref: ReferenceCode) => void
}

export function CodeCatalogScreen({
  codes,
  loading = false,
  onNew,
  onNewVirtual,
  onEdit,
  onEditVirtual,
  onDelete,
  isCodeInUse,
  onImport,
  importStatus,
  onSearchReference,
  onActivateReference,
}: CodeCatalogScreenProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ReferenceCode[]>([])
  const activeNumbers = new Set(codes.map((c) => c.number))
  // Name-sorted, already-active codes dropped (BIZ-049).
  const suggestions = sortReferenceByName(results, activeNumbers)
  // BIZ-073: the displayed list is fuzzy-filtered by the same query and always name-sorted, so a long
  // catalog is searchable in place (an empty query returns every code).
  const shownCodes = searchUserCodes(codes, query, { codeOnly: true }).map((m) => m.code)

  // Debounced autocomplete over the reference catalog.
  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults([])
      return
    }
    let cancelled = false
    const timer = setTimeout(() => {
      onSearchReference(q)
        .then((r) => !cancelled && setResults(r))
        .catch(() => !cancelled && setResults([]))
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, onSearchReference])

  const activate = (ref: ReferenceCode) => {
    onActivateReference(ref)
    setQuery('')
    setResults([])
  }

  return (
    <div className="wk-screen is-narrow">
      <div className="wk-screen-head">
        <div>
          <div className="wk-screen-title">Code catalog</div>
          <div className="wk-screen-sub">
            The codes you charge to. Search your reference catalog to add more.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="wk-btn-ghost" onClick={onImport}>
            ⇪ Import reference
          </button>
          <button type="button" className="wk-btn-ghost" onClick={onNewVirtual}>
            + New virtual code
          </button>
          <button
            type="button"
            className="wk-btn wk-btn-primary"
            style={{ padding: '8px 16px' }}
            onClick={onNew}
          >
            + New code
          </button>
        </div>
      </div>

      {importStatus && (
        <div
          className="wk-screen-sub"
          style={{
            marginBottom: 12,
            padding: '8px 12px',
            border: '1px solid var(--wk-line)',
            borderRadius: 'var(--wk-radius-md)',
          }}
        >
          {importStatus}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <input
          className="wk-input"
          value={query}
          placeholder="Search your codes — or type to add one from your reference catalog…"
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="wk-loading">Loading…</div>
      ) : (
        <>
          <div className="wk-catalog-list">
            {shownCodes.map((c) => (
              <CatalogCard
                key={c.id}
                code={c}
                inUse={isCodeInUse(c.id)}
                onEdit={onEdit}
                onEditVirtual={onEditVirtual}
                onDelete={onDelete}
              />
            ))}
            {codes.length === 0 && (
              <div className="wk-empty">
                <div className="wk-empty-title">No codes yet.</div>
                <div className="wk-empty-sub">
                  Your catalog has two tiers: import your full reference catalog once (
                  <span className="wk-accent">Import reference</span>), then search above to add the
                  handful of codes you actually charge to. See{' '}
                  <a href={`${DOCS_SITE_URL}catalog-import/`}>Importing your code catalog</a>.
                </div>
              </div>
            )}
            {codes.length > 0 && shownCodes.length === 0 && (
              <div className="wk-empty">
                <div className="wk-empty-title">No codes match “{query.trim()}”.</div>
                <div className="wk-empty-sub">
                  None of your codes match that search. Clear it to see them all, or add one from
                  your reference catalog below.
                </div>
              </div>
            )}
          </div>

          {/* Reference-catalog matches to activate — rendered in the flow, below the code list, so
              they never overlay it (BIZ-074). Distinct from the box's in-place filter (BIZ-073). */}
          {suggestions.length > 0 && (
            <section className="wk-ref-suggest">
              <div className="wk-ref-suggest-title">
                Add from your reference catalog ({suggestions.length})
              </div>
              <div className="wk-ref-suggest-list">
                {suggestions.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className="wk-suggest-item"
                    onClick={() => activate(r)}
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
            </section>
          )}
        </>
      )}
    </div>
  )
}

/**
 * One active code, with its activities collapsed behind a count (BIZ-045) so the list stays dense on
 * a large catalog. Codes with 0–1 activities render inline (nothing worth collapsing).
 */
function CatalogCard({
  code: c,
  inUse,
  onEdit,
  onEditVirtual,
  onDelete,
}: {
  code: TimesheetCode
  inUse: boolean
  onEdit: (code: TimesheetCode) => void
  onEditVirtual: (code: TimesheetCode) => void
  onDelete: (code: TimesheetCode) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const collapsible = c.activities.length > 1

  return (
    <div className="wk-catalog-card">
      <div className="wk-catalog-head">
        <span className="wk-dot" style={{ width: 10, height: 10, background: c.color }} />
        <div>
          <div className="wk-catalog-name">
            {c.name}
            {c.isVirtual && (
              <span
                className="wk-act-chip"
                style={{ marginLeft: 8, fontSize: 11, verticalAlign: 'middle' }}
              >
                virtual
              </span>
            )}
          </div>
          <div className="wk-catalog-meta">
            {c.number} · {c.label}
            {c.isVirtual && c.realCodeNumber && ` · backed by ${c.realCodeNumber}`}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button
            type="button"
            className="wk-btn-ghost"
            onClick={() => (c.isVirtual ? onEditVirtual(c) : onEdit(c))}
          >
            Edit
          </button>
          <button
            type="button"
            className="wk-btn-icon"
            title={inUse ? 'Used by entries — can’t delete' : 'Remove from my codes'}
            disabled={inUse}
            style={inUse ? { opacity: 0.4, cursor: 'default' } : undefined}
            onClick={() => onDelete(c)}
          >
            ✕
          </button>
        </div>
      </div>
      {c.activities.length > 0 &&
        (collapsible && !expanded ? (
          <button
            type="button"
            className="wk-catalog-acts-toggle"
            onClick={() => setExpanded(true)}
          >
            {c.activities.length} activities ▸
          </button>
        ) : (
          <div className="wk-catalog-acts">
            {collapsible && (
              <button
                type="button"
                className="wk-catalog-acts-toggle"
                onClick={() => setExpanded(false)}
              >
                ▾
              </button>
            )}
            {c.activities.map((a) => (
              <span key={a.code || a.label} className="wk-act-chip">
                {a.label}
              </span>
            ))}
          </div>
        ))}
    </div>
  )
}
