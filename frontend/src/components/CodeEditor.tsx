import { useState } from 'react'
import type { Activity, TimesheetCode } from '../types'
import { ColorPicker } from './ColorPicker'
import { InlineDeleteConfirm } from './InlineDeleteConfirm'
import { useEscapeToClose } from '../lib/useEscapeToClose'
import { formatList } from '../lib/text'
import { suggestColor } from '../lib/palette'

/** Fields borrowed from a reference-catalog entry when activating it through the editor (BIZ-049). */
export interface CodePrefill {
  number: string
  label: string
  name: string
  activities: Activity[]
}

interface CodeEditorProps {
  code: TimesheetCode | null // null = create a new code
  initialName?: string // prefill (e.g. the search query from the picker)
  prefill?: CodePrefill // prefill number/label/name/activities (activating a reference code, BIZ-049)
  codes: TimesheetCode[] // all visible codes — for the colour picker's avoidance + used markers
  onSave: (code: TimesheetCode) => void
  onDelete?: () => void // omitted when the code can't be deleted (new, or in use)
  onClose: () => void
}

/** Modal create/edit for a Timesheet code and its (hierarchical) activities. */
export function CodeEditor({
  code,
  initialName,
  prefill,
  codes,
  onSave,
  onDelete,
  onClose,
}: CodeEditorProps) {
  // The other codes whose colours to avoid/mark — this code excluded so its own colour reads as
  // selected, not taken (BIZ-048).
  const otherCodes = codes
    .filter((c) => c.id !== code?.id)
    .map((c) => ({ color: c.color, name: c.name }))
  const [number, setNumber] = useState(code?.number ?? prefill?.number ?? '')
  const [name, setName] = useState(code?.name ?? prefill?.name ?? initialName ?? '')
  const [label, setLabel] = useState(code?.label ?? prefill?.label ?? '')
  const [color, setColor] = useState(
    () => code?.color ?? suggestColor(otherCodes.map((c) => c.color)),
  )
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [activities, setActivities] = useState<Activity[]>(() => {
    const source = code?.activities.length ? code.activities : prefill?.activities
    return source?.length ? source.map((a) => ({ ...a })) : [{ code: '0001', label: '' }]
  })

  const setAct = (i: number, patch: Partial<Activity>) =>
    setActivities((list) => list.map((a, j) => (j === i ? { ...a, ...patch } : a)))
  const addAct = () => setActivities((list) => [...list, { code: '', label: '' }])
  const removeAct = (i: number) => setActivities((list) => list.filter((_, j) => j !== i))

  const cleanActivities = activities.filter((a) => a.label.trim())
  const canSave = number.trim().length > 0 && label.trim().length > 0 && cleanActivities.length > 0
  // What's still missing, so a disabled Save can say why instead of just dimming (BIZ clarify).
  const missing = [
    number.trim() ? null : 'a number',
    label.trim() ? null : 'a technical label',
    cleanActivities.length ? null : 'an activity',
  ].filter((m): m is string => m !== null)

  // Escape closes the editor (cancelling an armed delete-confirm first).
  useEscapeToClose(() => (confirmingDelete ? setConfirmingDelete(false) : onClose()))

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
    <div className="wk-overlay">
      {/* BIZ-059: no outside-click dismiss — a form modal closes only via ✕ / Cancel / Save. */}
      <div className="wk-modal">
        <div className="wk-modal-head">
          <span className="wk-modal-title">{code ? 'Edit code' : 'New code'}</span>
          <button type="button" className="wk-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label>
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

          <div>
            <div className="wk-screen-sub" style={{ marginBottom: 6 }}>
              Color
            </div>
            <ColorPicker value={color} onChange={setColor} otherCodes={otherCodes} />
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
              {onDelete &&
                (confirmingDelete ? (
                  <InlineDeleteConfirm
                    prompt="Delete this code?"
                    testid="wk-code-editor-delete"
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
                    data-testid="wk-code-editor-delete"
                    onClick={() => setConfirmingDelete(true)}
                  >
                    Delete
                  </button>
                ))}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {missing.length > 0 && (
                <span className="wk-form-hint" data-testid="wk-code-editor-save-hint">
                  Add {formatList(missing)} to save
                </span>
              )}
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
