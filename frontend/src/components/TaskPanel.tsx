import { useMemo, useState } from 'react'
import type {
  RecurrenceRule,
  ReferenceCode,
  Task,
  TaskPriority,
  TaskState,
  TimesheetCode,
} from '../types'
import { DEFAULT_TASK_STATES } from '../types'
import { selectOnFocus } from '../lib/time'
import { MarkdownEditor } from './MarkdownEditor'
import { CodePicker } from './CodePicker'

export interface TaskDraft {
  title: string
  description: string
  status: string
  priority: TaskPriority | null
  dueDate: string | null
  tags: string[]
  codeId: string | null
  recurrenceRule: RecurrenceRule | null
}

type RecurrenceKind = RecurrenceRule['kind']

const RECURRENCE_KIND_OPTIONS: { value: RecurrenceKind | ''; label: string }[] = [
  { value: '', label: 'Does not repeat' },
  { value: 'every_n_days', label: 'Every N days' },
  { value: 'weekly', label: 'Weekly, on chosen days' },
  { value: 'monthly', label: 'Monthly, on a day of month' },
  { value: 'period_relative', label: 'Relative to a Timesheet period boundary' },
]

const WEEKDAY_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Mon' },
  { value: 1, label: 'Tue' },
  { value: 2, label: 'Wed' },
  { value: 3, label: 'Thu' },
  { value: 4, label: 'Fri' },
  { value: 5, label: 'Sat' },
  { value: 6, label: 'Sun' },
]

/** A sensible default rule of each kind, used when switching the recurrence dropdown. */
function defaultRuleFor(kind: RecurrenceKind): RecurrenceRule {
  switch (kind) {
    case 'every_n_days':
      return { kind: 'every_n_days', n: 1 }
    case 'weekly':
      return { kind: 'weekly', weekdays: [0] }
    case 'monthly':
      return { kind: 'monthly', day: 1 }
    case 'period_relative':
      return { kind: 'period_relative', anchor: 'end', offsetDays: 0 }
  }
}

interface TaskPanelProps {
  task: Task | null // null = creating a new Task
  // Code to prefill when creating a new Task (BIZ-067: "Add" from a project section); ignored when
  // editing an existing Task.
  initialCodeId?: string | null
  codes: TimesheetCode[]
  taskStates?: TaskState[] // the user's ordered states (BIZ-056) — drives the dropdown; defaults to the five
  tagSuggestions: string[] // every tag used across the user's Tasks, for autocomplete
  onSave: (draft: TaskDraft) => void
  onDelete?: () => void // omit to hide the Delete action (e.g. while creating)
  onClose: () => void
  // Code selection via the shared CodePicker (BIZ-037). All optional so the panel still works
  // read-only without them; App wires them exactly as it does for the entry flow.
  onSearchReference?: (q: string) => Promise<ReferenceCode[]> // search the reference catalog
  // Activate a reference code through the code editor (BIZ-049); `onActivated` selects it here.
  onActivateReference?: (ref: ReferenceCode, onActivated: (code: TimesheetCode) => void) => void
  onCreateNew?: (query: string) => void // open the real-code editor prefilled with the query
  onCreateNewVirtual?: (query: string) => void // open the virtual-code editor
}

const PRIORITY_OPTIONS: { value: TaskPriority | ''; label: string }[] = [
  { value: '', label: 'No priority' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

/** Side panel to view/edit a Task's fields (BIZ-021) — create when `task` is null, edit otherwise. */
export function TaskPanel({
  task,
  initialCodeId = null,
  codes,
  taskStates = DEFAULT_TASK_STATES,
  tagSuggestions,
  onSave,
  onDelete,
  onClose,
  onSearchReference,
  onActivateReference,
  onCreateNew,
  onCreateNewVirtual,
}: TaskPanelProps) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [status, setStatus] = useState<string>(task?.status ?? taskStates[0]?.id ?? '')
  const [priority, setPriority] = useState<TaskPriority | null>(task?.priority ?? null)
  const [dueDate, setDueDate] = useState<string>(task?.dueDate ?? '')
  const [tags, setTags] = useState<string[]>(task?.tags ?? [])
  const [tagInput, setTagInput] = useState('')
  const [codeId, setCodeId] = useState<string | null>(task?.codeId ?? initialCodeId)
  const [codePickerOpen, setCodePickerOpen] = useState(false)
  const selectedCode = codeId ? (codes.find((c) => c.id === codeId) ?? null) : null
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(
    task?.recurrenceRule ?? null,
  )

  const suggestions = useMemo(() => {
    const q = tagInput.trim().toLowerCase()
    if (!q) return []
    return tagSuggestions
      .filter((t) => t.toLowerCase().includes(q) && !tags.includes(t))
      .slice(0, 6)
  }, [tagInput, tagSuggestions, tags])

  const addTag = (raw: string) => {
    const value = raw.trim()
    if (!value || tags.includes(value)) {
      setTagInput('')
      return
    }
    setTags((t) => [...t, value])
    setTagInput('')
  }
  const removeTag = (value: string) => setTags((t) => t.filter((tag) => tag !== value))

  const onTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  const save = () => {
    onSave({
      title: title.trim(),
      description,
      status,
      priority,
      dueDate: dueDate || null,
      tags,
      codeId,
      recurrenceRule,
    })
    onClose()
  }

  const canSave = title.trim() !== ''

  return (
    <div className="wk-panel-overlay">
      {/* BIZ-059: no outside-click dismiss — a form panel closes only via ✕ / Cancel / Save. */}
      <div className="wk-panel">
        <div className="wk-modal-head">
          <span className="wk-modal-title">{task ? 'Edit task' : 'New task'}</span>
          <button type="button" className="wk-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="wk-panel-body">
          <label>
            <div className="wk-screen-sub" style={{ marginBottom: 6 }}>
              Title
            </div>
            <input
              className="wk-input"
              value={title}
              onFocus={selectOnFocus}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs doing?"
              data-testid="wk-task-title-input"
              autoFocus
            />
          </label>

          <div>
            <div className="wk-screen-sub" style={{ marginBottom: 6 }}>
              Description
            </div>
            <MarkdownEditor
              value={description}
              onChange={setDescription}
              placeholder="Markdown notes…"
            />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <label style={{ flex: 1 }}>
              <div className="wk-screen-sub" style={{ marginBottom: 6 }}>
                Status
              </div>
              <select
                className="wk-input"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                data-testid="wk-task-status-select"
              >
                {taskStates.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ flex: 1 }}>
              <div className="wk-screen-sub" style={{ marginBottom: 6 }}>
                Priority
              </div>
              <select
                className="wk-input"
                value={priority ?? ''}
                onChange={(e) => setPriority((e.target.value || null) as TaskPriority | null)}
                data-testid="wk-task-priority-select"
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            <div className="wk-screen-sub" style={{ marginBottom: 6 }}>
              Due date
            </div>
            <input
              className="wk-input"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              data-testid="wk-task-due-input"
            />
          </label>

          <div>
            <div className="wk-screen-sub" style={{ marginBottom: 6 }}>
              Tags
            </div>
            {tags.length > 0 && (
              <div className="wk-tag-list">
                {tags.map((tag) => (
                  <span key={tag} className="wk-tag-chip">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      aria-label={`Remove tag ${tag}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="wk-tag-input-wrap">
              <input
                className="wk-input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={onTagKeyDown}
                onBlur={() => addTag(tagInput)}
                placeholder="Add a tag, press Enter…"
                data-testid="wk-task-tag-input"
              />
              {suggestions.length > 0 && (
                <div
                  className="wk-suggest"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 30,
                    marginTop: 4,
                  }}
                >
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="wk-suggest-item"
                      onClick={() => addTag(s)}
                      data-testid={`wk-task-tag-suggestion-${s}`}
                    >
                      <span className="wk-suggest-body">
                        <span className="wk-suggest-desc">{s}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="wk-screen-sub" style={{ marginBottom: 6 }}>
              Timesheet code
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                type="button"
                className="wk-input wk-task-code-trigger"
                style={{ flex: 1, textAlign: 'left', cursor: 'pointer' }}
                data-testid="wk-task-code-trigger"
                onClick={() => setCodePickerOpen(true)}
              >
                {selectedCode
                  ? `${selectedCode.name} · ${selectedCode.number}`
                  : codeId
                    ? 'Code selected'
                    : 'No code (orphan task)'}
              </button>
              {codeId && (
                <button
                  type="button"
                  className="wk-btn-ghost"
                  data-testid="wk-task-code-clear"
                  onClick={() => setCodeId(null)}
                >
                  No code
                </button>
              )}
            </div>
          </div>

          <div>
            <div className="wk-screen-sub" style={{ marginBottom: 6 }}>
              Repeats
            </div>
            <select
              className="wk-input"
              value={recurrenceRule?.kind ?? ''}
              onChange={(e) => {
                const kind = e.target.value as RecurrenceKind | ''
                setRecurrenceRule(kind === '' ? null : defaultRuleFor(kind))
              }}
              data-testid="wk-task-recurrence-kind-select"
            >
              {RECURRENCE_KIND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {recurrenceRule?.kind === 'every_n_days' && (
              <label style={{ display: 'block', marginTop: 10 }}>
                <div className="wk-screen-sub" style={{ marginBottom: 6 }}>
                  Every how many days
                </div>
                <input
                  className="wk-input"
                  type="number"
                  min={1}
                  value={recurrenceRule.n}
                  onChange={(e) =>
                    setRecurrenceRule({
                      kind: 'every_n_days',
                      n: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                  data-testid="wk-task-recurrence-every-n-days-input"
                />
              </label>
            )}

            {recurrenceRule?.kind === 'weekly' && (
              <div style={{ marginTop: 10 }}>
                <div className="wk-screen-sub" style={{ marginBottom: 6 }}>
                  On which days
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {WEEKDAY_OPTIONS.map((opt) => {
                    const checked = recurrenceRule.weekdays.includes(opt.value)
                    return (
                      <label
                        key={opt.value}
                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          data-testid={`wk-task-recurrence-weekday-${opt.value}`}
                          onChange={(e) => {
                            const weekdays = e.target.checked
                              ? [...recurrenceRule.weekdays, opt.value].sort((a, b) => a - b)
                              : recurrenceRule.weekdays.filter((d) => d !== opt.value)
                            setRecurrenceRule({
                              kind: 'weekly',
                              weekdays: weekdays.length > 0 ? weekdays : [opt.value],
                            })
                          }}
                        />
                        {opt.label}
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {recurrenceRule?.kind === 'monthly' && (
              <label style={{ display: 'block', marginTop: 10 }}>
                <div className="wk-screen-sub" style={{ marginBottom: 6 }}>
                  Day of month
                </div>
                <input
                  className="wk-input"
                  type="number"
                  min={1}
                  max={31}
                  value={recurrenceRule.day}
                  onChange={(e) =>
                    setRecurrenceRule({
                      kind: 'monthly',
                      day: Math.min(31, Math.max(1, Number(e.target.value) || 1)),
                    })
                  }
                  data-testid="wk-task-recurrence-monthly-day-input"
                />
              </label>
            )}

            {recurrenceRule?.kind === 'period_relative' && (
              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <label style={{ flex: 1 }}>
                  <div className="wk-screen-sub" style={{ marginBottom: 6 }}>
                    Anchor
                  </div>
                  <select
                    className="wk-input"
                    value={recurrenceRule.anchor}
                    onChange={(e) =>
                      setRecurrenceRule({
                        kind: 'period_relative',
                        anchor: e.target.value as 'start' | 'end',
                        offsetDays: recurrenceRule.offsetDays,
                      })
                    }
                    data-testid="wk-task-recurrence-anchor-select"
                  >
                    <option value="start">Timesheet period start</option>
                    <option value="end">Timesheet period end</option>
                  </select>
                </label>
                <label style={{ flex: 1 }}>
                  <div className="wk-screen-sub" style={{ marginBottom: 6 }}>
                    Offset (working days)
                  </div>
                  <input
                    className="wk-input"
                    type="number"
                    value={recurrenceRule.offsetDays}
                    onChange={(e) =>
                      setRecurrenceRule({
                        kind: 'period_relative',
                        anchor: recurrenceRule.anchor,
                        offsetDays: Number(e.target.value) || 0,
                      })
                    }
                    data-testid="wk-task-recurrence-offset-input"
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="wk-panel-foot">
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
              style={{ padding: '10px 22px' }}
              onClick={save}
              disabled={!canSave}
              data-testid="wk-task-save"
            >
              Save
            </button>
          </div>
        </div>
      </div>

      {codePickerOpen && (
        <CodePicker
          codeOnly
          title="Task code"
          codes={codes}
          onPick={(id) => {
            setCodeId(id)
            setCodePickerOpen(false)
          }}
          onClose={() => setCodePickerOpen(false)}
          onCreateNew={
            onCreateNew &&
            ((q) => {
              setCodePickerOpen(false)
              onCreateNew(q)
            })
          }
          onCreateNewVirtual={
            onCreateNewVirtual &&
            ((q) => {
              setCodePickerOpen(false)
              onCreateNewVirtual(q)
            })
          }
          onSearchReference={onSearchReference}
          onActivateReference={
            onActivateReference &&
            ((ref) =>
              onActivateReference(ref, (created) => {
                setCodeId(created.id)
                setCodePickerOpen(false)
              }))
          }
        />
      )}
    </div>
  )
}
