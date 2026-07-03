import { useState } from 'react'
import type { Activity, TimesheetCode } from '../types'

interface CodeEditorProps {
  code: TimesheetCode | null // null = create a new code
  initialName?: string // prefill (e.g. the search query from the picker)
  onSave: (code: TimesheetCode) => void
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

/** Modal create/edit for a Timesheet code and its (hierarchical) activities. */
export function CodeEditor({ code, initialName, onSave, onDelete, onClose }: CodeEditorProps) {
  const [number, setNumber] = useState(code?.number ?? '')
  const [name, setName] = useState(code?.name ?? initialName ?? '')
  const [label, setLabel] = useState(code?.label ?? '')
  const [color, setColor] = useState(code?.color ?? PALETTE[0])
  const [activities, setActivities] = useState<Activity[]>(
    code?.activities.length
      ? code.activities.map((a) => ({ ...a }))
      : [{ code: '0001', label: '' }],
  )

  const setAct = (i: number, patch: Partial<Activity>) =>
    setActivities((list) => list.map((a, j) => (j === i ? { ...a, ...patch } : a)))
  const addAct = () => setActivities((list) => [...list, { code: '', label: '' }])
  const removeAct = (i: number) => setActivities((list) => list.filter((_, j) => j !== i))

  const cleanActivities = activities.filter((a) => a.label.trim())
  const canSave = number.trim().length > 0 && label.trim().length > 0 && cleanActivities.length > 0

  const save = () => {
    if (!canSave) return
    onSave({
      id: code?.id ?? crypto.randomUUID(),
      number: number.trim(),
      label: label.trim(),
      name: name.trim() || label.trim(),
      color,
      activities: cleanActivities.map((a) => ({ code: a.code.trim(), label: a.label.trim() })),
      isVirtual: false,
      realCodeId: null,
      realCodeNumber: null,
    })
    onClose()
  }

  return (
    <div className="wk-overlay" onClick={onClose}>
      <div className="wk-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wk-modal-head">
          <span className="wk-modal-title">{code ? 'Edit code' : 'New code'}</span>
          <button type="button" className="wk-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <label style={{ flex: 1 }}>
              <div className="wk-screen-sub" style={{ marginBottom: 6 }}>
                Number
              </div>
              <input
                className="wk-input"
                value={number}
                placeholder="N9/1042"
                onChange={(e) => setNumber(e.target.value)}
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

          <label>
            <div className="wk-screen-sub" style={{ marginBottom: 6 }}>
              Technical label
            </div>
            <input
              className="wk-input"
              value={label}
              placeholder="MNT - PAP V4"
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>

          <label>
            <div className="wk-screen-sub" style={{ marginBottom: 6 }}>
              Project name (optional)
            </div>
            <input
              className="wk-input"
              value={name}
              placeholder="Paper V4 — defaults to the technical label"
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <div>
            <div className="wk-screen-sub" style={{ marginBottom: 6 }}>
              Activities
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activities.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    className="wk-input"
                    value={a.code}
                    placeholder="0001"
                    style={{ width: 82 }}
                    onChange={(e) => setAct(i, { code: e.target.value })}
                  />
                  <input
                    className="wk-input"
                    value={a.label}
                    placeholder="Bug fixing"
                    style={{ flex: 1 }}
                    onChange={(e) => setAct(i, { label: e.target.value })}
                  />
                  <button
                    type="button"
                    className="wk-btn-icon"
                    title="Remove activity"
                    onClick={() => removeAct(i)}
                    disabled={activities.length === 1}
                    style={
                      activities.length === 1 ? { opacity: 0.4, cursor: 'default' } : undefined
                    }
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="wk-btn-ghost"
                style={{ alignSelf: 'flex-start' }}
                onClick={addAct}
              >
                + Add activity
              </button>
            </div>
          </div>

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
