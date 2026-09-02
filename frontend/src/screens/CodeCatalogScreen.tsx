import { useEffect, useState } from 'react'
import type { ReferenceCode, TimesheetCode } from '../types'
import { searchUserCodes, sortReferenceByName } from '../lib/codeSearch'
import { DOCS_SITE_URL } from '../lib/links'
import { InlineDeleteConfirm } from '../components/InlineDeleteConfirm'

interface CodeCatalogScreenProps {
  codes: TimesheetCode[]
  /** True until the first codes response has arrived — avoids flashing the empty state. */
  loading?: boolean
  onNew: () => void
  onNewVirtual: () => void
  onEdit: (code: TimesheetCode) => void
  onEditVirtual: (code: TimesheetCode) => void
  onDelete: (code: TimesheetCode) => void
  onShowTotals: (code: TimesheetCode) => void // BIZ-089: "how much time did you spend on X?"
  // BIZ-090: retire a code, or bring it back. Retired codes are filtered out here unless the toggle
  // is on, and are never in any picker.
  onRetire: (code: TimesheetCode) => void
  onRestore: (code: TimesheetCode) => void
  showObsolete: boolean
  onShowObsoleteChange: (show: boolean) => void
  // What stands between a code and its ✕, if anything (BIZ-088). `virtual` still hard-disables the
  // button — the fix there is to delete the virtual codes first. `entries` no longer does: the
  // client only knows about the entries currently loaded, so the server is the authority, and
  // clicking through opens the resolve flow instead of a dead end.
  deleteBlockedBy: (id: string) => 'entries' | 'virtual' | null
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
  onShowTotals,
  onRetire,
  onRestore,
  showObsolete,
  onShowObsoleteChange,
  deleteBlockedBy,
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
  // BIZ-090: retired codes are dropped unless the toggle is on. The count is what makes hiding safe
  // rather than mysterious — the same reasoning as the Tasks list's Done toggle (BIZ-087).
  const obsoleteCount = codes.filter((c) => c.obsolete).length
  const listed = showObsolete ? codes : codes.filter((c) => !c.obsolete)
  const shownCodes = searchUserCodes(listed, query, { codeOnly: true }).map((m) => m.code)

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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Import is a one-time setup action (the empty state guides it) — kept as a quiet utility,
              set apart from the two create actions so it no longer competes at equal weight. */}
          <button
            type="button"
            className="wk-btn-quiet"
            title="Import your full reference catalog from a file (one-time setup)"
            onClick={onImport}
          >
            ⇪ Import reference
          </button>
          <span className="wk-header-divider" aria-hidden="true" />
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

      <div className="wk-catalog-filters">
        <input
          className="wk-input"
          value={query}
          placeholder="Search your codes — or type to add one from your reference catalog…"
          onChange={(e) => setQuery(e.target.value)}
        />
        {/* BIZ-090: labelled with the count, and disabled when there is nothing to reveal, so a
            hidden code is never a mystery — mirrors the Tasks list's Done toggle (BIZ-087). */}
        <button
          type="button"
          className={`wk-btn-ghost wk-catalog-obsolete-toggle${showObsolete ? ' is-on' : ''}`}
          aria-pressed={showObsolete}
          disabled={obsoleteCount === 0}
          onClick={() => onShowObsoleteChange(!showObsolete)}
        >
          Retired ({obsoleteCount})
        </button>
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
                blockedBy={deleteBlockedBy(c.id)}
                onShowTotals={onShowTotals}
                onRetire={onRetire}
                onRestore={onRestore}
                onEdit={onEdit}
                onEditVirtual={onEditVirtual}
                onDelete={onDelete}
              />
            ))}
            {codes.length === 0 && (
              <div className="wk-empty">
                <div className="wk-empty-title">Nothing on the books yet.</div>
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
  blockedBy,
  onShowTotals,
  onRetire,
  onRestore,
  onEdit,
  onEditVirtual,
  onDelete,
}: {
  code: TimesheetCode
  blockedBy: 'entries' | 'virtual' | null
  onShowTotals: (code: TimesheetCode) => void
  onRetire: (code: TimesheetCode) => void
  onRestore: (code: TimesheetCode) => void
  onEdit: (code: TimesheetCode) => void
  onEditVirtual: (code: TimesheetCode) => void
  onDelete: (code: TimesheetCode) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const collapsible = c.activities.length > 1

  return (
    <div className={`wk-catalog-card${c.isVirtual ? ' is-virtual' : ''}`}>
      {/* Leading code-colour bar: the code's own colour is its identity (DESIGN.md), and it doubles
          as the row's ledger rule. Colour is per-code, so it lives inline. */}
      <span className="wk-catalog-bar" style={{ background: c.color }} aria-hidden="true" />
      <div className="wk-catalog-head">
        <div>
          <div className="wk-catalog-name">
            {c.name}
            {c.isVirtual && <span className="wk-code-virtual-badge">virtual</span>}
            {c.obsolete && <span className="wk-code-obsolete-badge">retired</span>}
          </div>
          <div className="wk-catalog-meta">
            {c.number} · {c.label}
            {/* "backed by" only earns its place when it names a *different* code than the one shown
                (a virtual borrows its backing code's number, so otherwise it just repeats it). */}
            {c.isVirtual &&
              c.realCodeNumber &&
              c.realCodeNumber !== c.number &&
              ` · backed by ${c.realCodeNumber}`}
            {/* BIZ-092: the same fact the post-import alert raised, kept where the code lives so it
                survives the message. Deliberately understated — it is a prompt, not a verdict: the
                code may simply be outside the scope of the file that was imported. */}
            {c.missingFromCatalog && !c.obsolete && (
              <span className="wk-code-missing"> · not in your imported catalog</span>
            )}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          {confirmingDelete ? (
            <InlineDeleteConfirm
              prompt="Remove?"
              confirmLabel="Remove"
              testid={`wk-catalog-delete-${c.id}`}
              onCancel={() => setConfirmingDelete(false)}
              onConfirm={() => {
                onDelete(c)
                setConfirmingDelete(false)
              }}
            />
          ) : (
            <>
              <button
                type="button"
                className="wk-btn-icon"
                title="How much time have I spent on this?"
                data-testid={`wk-catalog-totals-${c.id}`}
                onClick={() => onShowTotals(c)}
              >
                ⏱
              </button>
              <button
                type="button"
                className="wk-btn-ghost"
                data-testid={`wk-catalog-retire-${c.id}`}
                onClick={() => (c.obsolete ? onRestore(c) : onRetire(c))}
              >
                {c.obsolete ? 'Restore' : 'Retire'}
              </button>
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
                title={
                  blockedBy === 'virtual'
                    ? 'Virtual codes point at this one — delete those first'
                    : blockedBy === 'entries'
                      ? 'Used by entries — see what is in the way'
                      : 'Remove from my codes'
                }
                disabled={blockedBy === 'virtual'}
                style={blockedBy === 'virtual' ? { opacity: 0.4, cursor: 'default' } : undefined}
                data-testid={`wk-catalog-delete-${c.id}`}
                onClick={() => setConfirmingDelete(true)}
              >
                ✕
              </button>
            </>
          )}
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
