import { useState } from 'react'
import type { ReferenceCode, TimesheetCode } from '../types'
import { ColorPicker } from './ColorPicker'
import { CodePicker } from './CodePicker'
import { InlineDeleteConfirm } from './InlineDeleteConfirm'
import { suggestColor } from '../lib/palette'

interface VirtualCodeEditorProps {
  code: TimesheetCode | null // null = create a new virtual code
  realCodes: TimesheetCode[] // real codes only — the candidates for the backing code
  codes: TimesheetCode[] // all visible codes — for the colour picker's avoidance + used markers
  onSave: (input: { realCodeId: string; name: string; color: string }) => Promise<void>
  onDelete?: () => void // omitted when the code can't be deleted (new, or in use)
  onClose: () => void
  // Backing-code selection via the shared CodePicker (BIZ-049). Optional so the editor still works
  // without them (e.g. in isolation tests).
  onSearchReference?: (q: string) => Promise<ReferenceCode[]> // search the reference catalog
  // Back the virtual with a reference code that isn't active yet (BIZ-075, ADR-0014): creates it as a
  // hidden backing-only real code (no editor, auto colour); `onActivated` selects it as the backing.
  onActivateReference?: (ref: ReferenceCode, onActivated: (code: TimesheetCode) => void) => void
}

/** Modal to create/edit a virtual code: pick the backing real code, name it, give it a colour (ADR-0008). */
export function VirtualCodeEditor({
  code,
  realCodes,
  codes,
  onSave,
  onDelete,
  onClose,
  onSearchReference,
  onActivateReference,
}: VirtualCodeEditorProps) {
  // Avoid/mark the other codes' colours; exclude this code so its own reads as selected (BIZ-048).
  const otherCodes = codes
    .filter((c) => c.id !== code?.id)
    .map((c) => ({ color: c.color, name: c.name }))
  const [realCodeId, setRealCodeId] = useState(code?.realCodeId ?? realCodes[0]?.id ?? '')
  const [name, setName] = useState(code?.name ?? '')
  const [color, setColor] = useState(
    () => code?.color ?? suggestColor(otherCodes.map((c) => c.color)),
  )
  const [backingPickerOpen, setBackingPickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const selectedReal = realCodes.find((c) => c.id === realCodeId) ?? null
  const canSave = realCodeId !== '' && name.trim().length > 0 && !saving

  const save = () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    onSave({ realCodeId, name: name.trim(), color })
      .then(onClose)
      .catch((err: unknown) => {
        setSaving(false)
        setError(err instanceof Error ? err.message : 'Failed to save — try again.')
      })
  }

  return (
    <div className="wk-overlay">
      {/* BIZ-059: no outside-click dismiss — a form modal closes only via ✕ / Cancel / Save. */}
      <div className="wk-modal">
        <div className="wk-modal-head">
          <span className="wk-modal-title">{code ? 'Edit virtual code' : 'New virtual code'}</span>
          <button type="button" className="wk-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div className="wk-screen-sub" style={{ marginBottom: 6 }}>
              Real code
            </div>
            {/* BIZ-049: searchable backing selector (real codes + reference catalog), not a bare select. */}
            <button
              type="button"
              className="wk-input wk-task-code-trigger"
              style={{
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
              data-testid="wk-virtual-backing-trigger"
              onClick={() => setBackingPickerOpen(true)}
            >
              {selectedReal ? (
                <>
                  <span className="wk-dot" style={{ background: selectedReal.color }} />
                  <span>
                    {selectedReal.number} · {selectedReal.name}
                  </span>
                </>
              ) : (
                <span className="wk-screen-sub">Pick a real code…</span>
              )}
            </button>
          </div>

          <label>
            <div className="wk-screen-sub" style={{ marginBottom: 6 }}>
              Name
            </div>
            <input
              className="wk-input"
              value={name}
              placeholder="Workday contact info"
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <div>
            <div className="wk-screen-sub" style={{ marginBottom: 6 }}>
              Color
            </div>
            <ColorPicker value={color} onChange={setColor} otherCodes={otherCodes} />
          </div>

          {error && (
            <div className="wk-modal-empty" style={{ color: 'var(--wk-red, #e5644e)' }}>
              {error}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 4,
            }}
          >
            <div>
              {onDelete &&
                (confirmingDelete ? (
                  <InlineDeleteConfirm
                    prompt="Delete this code?"
                    testid="wk-virtual-editor-delete"
                    confirmStyle={{ padding: '10px 18px' }}
                    onCancel={() => setConfirmingDelete(false)}
                    onConfirm={() => {
                      onDelete()
                      onClose()
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className="wk-btn wk-btn-danger"
                    style={{ padding: '10px 18px' }}
                    data-testid="wk-virtual-editor-delete"
                    onClick={() => setConfirmingDelete(true)}
                  >
                    Delete
                  </button>
                ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="wk-btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="wk-btn wk-btn-primary"
                style={{ padding: '10px 22px', opacity: canSave ? 1 : 0.5 }}
                onClick={save}
                disabled={!canSave}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {backingPickerOpen && (
        <CodePicker
          codeOnly
          realOnly
          title="Backing real code"
          codes={realCodes}
          onPick={(id) => {
            setRealCodeId(id)
            setBackingPickerOpen(false)
          }}
          onClose={() => setBackingPickerOpen(false)}
          onSearchReference={onSearchReference}
          onActivateReference={
            onActivateReference &&
            ((ref) =>
              onActivateReference(ref, (created) => {
                setRealCodeId(created.id)
                setBackingPickerOpen(false)
              }))
          }
        />
      )}
    </div>
  )
}
