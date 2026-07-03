import { useState } from 'react'
import type { TimesheetCode } from '../types'

interface VirtualCodeEditorProps {
  code: TimesheetCode | null // null = create a new virtual code
  realCodes: TimesheetCode[] // real codes only — the candidates for the backing code
  onSave: (input: { realCodeId: string; name: string; color: string }) => void
  onDelete?: () => void // omitted when the code can't be deleted (new, or in use)
  onClose: () => void
}

const PALETTE = [
  '#5b9cf6',
  '#3fb68b',
  '#c88b5b',
  '#a879d6',
  '#e8a84b',
  '#e5644e',
  '#5bd6c4',
  '#d67ba8',
]

/** Modal to create/edit a virtual code: pick the backing real code, name it, give it a colour (ADR-0008). */
export function VirtualCodeEditor({
  code,
  realCodes,
  onSave,
  onDelete,
  onClose,
}: VirtualCodeEditorProps) {
  const [realCodeId, setRealCodeId] = useState(code?.realCodeId ?? realCodes[0]?.id ?? '')
  const [name, setName] = useState(code?.name ?? '')
  const [color, setColor] = useState(code?.color ?? PALETTE[0])

  const canSave = realCodeId !== '' && name.trim().length > 0

  const save = () => {
    if (!canSave) return
    onSave({ realCodeId, name: name.trim(), color })
    onClose()
  }

  return (
    <div className="wk-overlay" onClick={onClose}>
      <div className="wk-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wk-modal-head">
          <span className="wk-modal-title">{code ? 'Edit virtual code' : 'New virtual code'}</span>
          <button type="button" className="wk-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {realCodes.length === 0 ? (
            <div className="wk-modal-empty">
              Add a real code first — a virtual code needs one to back it.
            </div>
          ) : (
            <>
              <label>
                <div className="wk-screen-sub" style={{ marginBottom: 6 }}>
                  Real code
                </div>
                <select
                  className="wk-input"
                  value={realCodeId}
                  onChange={(e) => setRealCodeId(e.target.value)}
                >
                  {realCodes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.number} · {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ display: 'flex', gap: 12 }}>
                <label style={{ flex: 1 }}>
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
                <label style={{ width: 64 }}>
                  <div className="wk-screen-sub" style={{ marginBottom: 6 }}>
                    Color
                  </div>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    style={{
                      width: '100%',
                      height: 40,
                      background: 'none',
                      border: '1px solid var(--wk-line)',
                      borderRadius: 'var(--wk-radius-md)',
                      cursor: 'pointer',
                    }}
                  />
                </label>
              </div>
            </>
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
              {onDelete && (
                <button
                  type="button"
                  className="wk-btn wk-btn-danger"
                  style={{ padding: '10px 18px' }}
                  onClick={() => {
                    onDelete()
                    onClose()
                  }}
                >
                  Delete
                </button>
              )}
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
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
