import { Fragment, useCallback, useMemo, useState } from 'react'
import type { Task, TaskState, TaskStatus, TimesheetCode, ViewPreferences } from '../types'
import { DEFAULT_TASK_STATES } from '../types'
import { IconPlay } from '../components/icons'
import { TaskBoard, type TaskStateEdits } from '../components/TaskBoard'
import { describeDue } from '../lib/dueDate'

export type TaskSortField = 'status' | 'priority' | 'due' | 'title'
export type TaskGroupField = 'none' | 'status' | 'priority' | 'due' | 'code'
export type TaskViewMode = 'list' | 'board'
type SortDir = 'asc' | 'desc'
/** The view-preference keys this screen owns (BIZ-053). */
type TaskViewPrefs = Pick<
  ViewPreferences,
  'task_view' | 'task_sort' | 'task_sort_dir' | 'task_group'
>

interface TasksScreenProps {
  tasks: Task[]
  codesById: Record<string, TimesheetCode>
  taskStates?: TaskState[] // the user's ordered states (BIZ-056); defaults to the five built-ins
  stateEdits?: TaskStateEdits // in-kanban column editing (BIZ-057); omit to hide the controls
  loading?: boolean
  onNew: () => void
  // BIZ-067: "Add" a Task from a project section header, prefilled with that section's code (null
  // for "No project"). Used only when grouping by project (code); omit to hide the per-section Add.
  onNewInCode?: (codeId: string | null) => void
  onOpenTask: (task: Task) => void
  // Start a Timer from this Task (BIZ-023) — title as comment, code prefilled. Omit to hide the
  // row action (e.g. a read-only context).
  onStartTask?: (task: Task) => void
  /** Called when a Task is moved to another column on the board (BIZ-022). */
  onMoveTask?: (task: Task, status: TaskStatus) => void
  // BIZ-053: persisted view preferences. Supply both to control view/group/sort + Done collapse;
  // omit them and the screen keeps that state locally (standalone / tests).
  preferences?: ViewPreferences
  onPreferencesChange?: (patch: Partial<ViewPreferences>) => void
}

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

function dueGroupLabel(dueDate: string | null, today: string): string {
  if (!dueDate) return 'No due date'
  if (dueDate < today) return 'Overdue'
  if (dueDate === today) return 'Today'
  return 'Upcoming'
}

function compareTasks(
  a: Task,
  b: Task,
  field: TaskSortField,
  statusIndex: (id: string) => number,
): number {
  switch (field) {
    case 'title':
      return a.title.localeCompare(b.title)
    case 'status':
      return statusIndex(a.status) - statusIndex(b.status)
    case 'priority': {
      const pa = a.priority ? (PRIORITY_ORDER[a.priority] ?? 3) : 3
      const pb = b.priority ? (PRIORITY_ORDER[b.priority] ?? 3) : 3
      return pa - pb
    }
    case 'due': {
      const da = a.dueDate ?? '9999-99-99'
      const db = b.dueDate ?? '9999-99-99'
      return da.localeCompare(db)
    }
    default:
      return 0
  }
}

const NO_PROJECT = 'No project'

function groupKeyFor(
  task: Task,
  field: TaskGroupField,
  today: string,
  codesById: Record<string, TimesheetCode>,
  statusLabel: (id: string) => string,
): string {
  switch (field) {
    case 'status':
      return statusLabel(task.status)
    case 'priority':
      return task.priority ? task.priority[0].toUpperCase() + task.priority.slice(1) : 'No priority'
    case 'due':
      return dueGroupLabel(task.dueDate, today)
    case 'code':
      return task.codeId ? (codesById[task.codeId]?.name ?? task.codeId) : NO_PROJECT
    default:
      return ''
  }
}

/**
 * Tasks view — toggles between a sortable/groupable list (grid) and a kanban board (BIZ-022),
 * both over the same Tasks. Click a row/card to open its side panel (BIZ-021).
 */
export function TasksScreen({
  tasks,
  codesById,
  taskStates = DEFAULT_TASK_STATES,
  stateEdits,
  loading = false,
  onNew,
  onNewInCode,
  onOpenTask,
  onStartTask,
  onMoveTask,
  preferences,
  onPreferencesChange,
}: TasksScreenProps) {
  // Positional helpers over the user's state list (BIZ-056): label + order by id. An unknown id
  // (e.g. a Task briefly out of sync after a state delete) falls back to the id and sorts last.
  // useCallback keeps them stable so the sort/group memos below don't recompute every render.
  const statusLabel = useCallback(
    (id: string) => taskStates.find((s) => s.id === id)?.label ?? id,
    [taskStates],
  )
  const statusIndex = useCallback(
    (id: string) => {
      const i = taskStates.findIndex((s) => s.id === id)
      return i === -1 ? taskStates.length : i
    },
    [taskStates],
  )
  // BIZ-053: controlled by the parent (persisted) when `preferences`+`onPreferencesChange` are
  // supplied; otherwise the screen keeps this state locally, so it still works standalone (tests).
  const [local, setLocal] = useState({
    task_view: 'list' as TaskViewMode,
    task_sort: 'due' as TaskSortField,
    task_sort_dir: 'asc' as SortDir,
    task_group: 'none' as TaskGroupField,
  })
  const patchPrefs = (patch: Partial<TaskViewPrefs>) => {
    if (onPreferencesChange) onPreferencesChange(patch)
    else setLocal((l) => ({ ...l, ...patch }))
  }
  const view = (preferences?.task_view ?? local.task_view) as TaskViewMode
  const sort = (preferences?.task_sort ?? local.task_sort) as TaskSortField
  const sortDir = (preferences?.task_sort_dir ?? local.task_sort_dir) as SortDir
  const group = (preferences?.task_group ?? local.task_group) as TaskGroupField
  const setView = (v: TaskViewMode) => patchPrefs({ task_view: v })
  const setSort = (s: TaskSortField) => patchPrefs({ task_sort: s })
  const setGroup = (g: TaskGroupField) => patchPrefs({ task_group: g })
  const today = new Date().toISOString().slice(0, 10)

  // The terminal (last) state — a task there is "done", so it's never flagged overdue (ADR-0011).
  const terminalId = taskStates[taskStates.length - 1]?.id

  // "Focus" filter (applies to both List and Board): show only actionable tasks that need attention
  // now — overdue, due today, or high priority. Transient (not persisted), so the saved view/group
  // the user likes (e.g. kanban by project) is preserved; the filter just narrows what's shown.
  const [focus, setFocus] = useState(false)
  const isFocusTask = useCallback(
    (t: Task) => {
      if (t.status === terminalId) return false
      const due = t.dueDate ? describeDue(t.dueDate, today) : null
      return (due !== null && (due.overdue || due.dueToday)) || t.priority === 'high'
    },
    [terminalId, today],
  )
  const focusCount = useMemo(() => tasks.filter(isFocusTask).length, [tasks, isFocusTask])
  const visibleTasks = useMemo(
    () => (focus ? tasks.filter(isFocusTask) : tasks),
    [tasks, focus, isFocusTask],
  )

  const toggleSort = (field: TaskSortField) => {
    if (field === sort) {
      patchPrefs({ task_sort_dir: sortDir === 'asc' ? 'desc' : 'asc' })
    } else {
      patchPrefs({ task_sort: field, task_sort_dir: 'asc' })
    }
  }

  const sorted = useMemo(
    () =>
      [...visibleTasks].sort(
        (a, b) => (sortDir === 'asc' ? 1 : -1) * compareTasks(a, b, sort, statusIndex),
      ),
    [visibleTasks, sort, sortDir, statusIndex],
  )

  const groups = useMemo(() => {
    if (group === 'none') return [{ label: null as string | null, items: sorted }]
    const byKey = new Map<string, Task[]>()
    for (const task of sorted) {
      const key = groupKeyFor(task, group, today, codesById, statusLabel)
      const list = byKey.get(key) ?? []
      list.push(task)
      byKey.set(key, list)
    }
    const entries = [...byKey.entries()].map(([label, items]) => ({ label, items }))
    // Grouping by project (code) orders lanes by code name ascending, "No project" last (BIZ-036).
    if (group === 'code') {
      entries.sort((a, b) => {
        if (a.label === NO_PROJECT) return 1
        if (b.label === NO_PROJECT) return -1
        return a.label.localeCompare(b.label)
      })
    }
    // Grouping by status follows the user's state order (BIZ-057), not first-appearance.
    if (group === 'status') {
      const rank = (label: string) => taskStates.findIndex((s) => s.label === label)
      entries.sort((a, b) => rank(a.label ?? '') - rank(b.label ?? ''))
    }
    // Grouping by due date reads as a prioritised agenda: most urgent first, undated last.
    if (group === 'due') {
      const order = ['Overdue', 'Today', 'Upcoming', 'No due date']
      entries.sort((a, b) => order.indexOf(a.label ?? '') - order.indexOf(b.label ?? ''))
    }
    return entries
  }, [sorted, group, today, codesById, statusLabel, taskStates])

  const sortHeader = (field: TaskSortField, label: string) => (
    <th
      className={sort === field ? 'is-sorted' : undefined}
      onClick={() => toggleSort(field)}
      data-testid={`wk-task-sort-${field}`}
    >
      {label}
      {sort === field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
    </th>
  )

  // BIZ-051: when grouped by project (code), the code is already the section header — drop the
  // now-redundant Code column (header + each row's cell); other groupings keep it.
  const showCode = group !== 'code'
  const columnCount = 2 + (showCode ? 1 : 0) + (onStartTask ? 1 : 0)

  const renderRow = (task: Task) => {
    const code = task.codeId ? (codesById[task.codeId] ?? null) : null
    const due = task.dueDate ? describeDue(task.dueDate, today) : null
    // Overdue or due today, unless the task is done (terminal state is never flagged — ADR-0011).
    const flagged = due !== null && (due.overdue || due.dueToday) && task.status !== terminalId
    return (
      <tr
        key={task.id}
        className="wk-task-row"
        onClick={() => onOpenTask(task)}
        data-testid={`wk-task-row-${task.id}`}
      >
        <td>
          <div className="wk-task-title">{task.title}</div>
          {/* Priority & due show as inline pills only when set — no always-empty columns (BIZ-041). */}
          {(task.priority || task.dueDate || task.tags.length > 0) && (
            <div className="wk-task-meta-pills">
              {task.priority && (
                <span className={`wk-task-priority is-${task.priority}`}>{task.priority}</span>
              )}
              {due && (
                <span
                  className={flagged ? 'wk-task-due is-overdue' : 'wk-task-due'}
                  title={task.dueDate ?? undefined}
                >
                  {due.label}
                </span>
              )}
              {task.tags.map((tag) => (
                <span key={tag} className="wk-task-tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </td>
        <td>
          {/* Inline status change (BIZ-043) — reuses the same move path as the board. */}
          {onMoveTask ? (
            <select
              className="wk-task-status-select"
              value={task.status}
              data-testid={`wk-task-status-select-${task.id}`}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onMoveTask(task, e.target.value)}
            >
              {taskStates.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          ) : (
            <span className="wk-task-status">{statusLabel(task.status)}</span>
          )}
        </td>
        {showCode && (
          <td>
            {code ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span className="wk-dot" style={{ width: 8, height: 8, background: code.color }} />
                {code.name}
              </span>
            ) : (
              '—'
            )}
          </td>
        )}
        {onStartTask && (
          <td>
            <button
              type="button"
              className="wk-btn-icon wk-task-row-start"
              title="Start a Timer from this task"
              data-testid={`wk-task-start-${task.id}`}
              onClick={(e) => {
                e.stopPropagation()
                onStartTask(task)
              }}
            >
              <IconPlay />
            </button>
          </td>
        )}
      </tr>
    )
  }

  return (
    <div className="wk-screen">
      <div className="wk-screen-head">
        <div>
          <div className="wk-screen-title">Tasks</div>
          <div className="wk-screen-sub">Things to do — with or without a Timesheet code.</div>
        </div>
        <button
          type="button"
          className="wk-btn wk-btn-primary"
          style={{ padding: '8px 16px' }}
          onClick={onNew}
        >
          + New task
        </button>
      </div>

      <div className="wk-tasks-toolbar">
        <div className="wk-task-view-toggle">
          <button
            type="button"
            className={view === 'list' ? 'is-active' : undefined}
            onClick={() => setView('list')}
            data-testid="wk-task-view-list"
          >
            List
          </button>
          <button
            type="button"
            className={view === 'board' ? 'is-active' : undefined}
            onClick={() => setView('board')}
            data-testid="wk-task-view-board"
          >
            Board
          </button>
        </div>
        <button
          type="button"
          className={`wk-task-focus${focus ? ' is-active' : ''}`}
          aria-pressed={focus}
          disabled={!focus && focusCount === 0}
          onClick={() => setFocus((f) => !f)}
          data-testid="wk-task-focus"
          title="Show only tasks needing attention — overdue, due today, or high priority"
        >
          <span className="wk-task-focus-flag" aria-hidden="true">
            ⚑
          </span>
          Focus
          <span className="wk-task-focus-count">{focusCount}</span>
        </button>
        {view === 'list' && (
          <label>
            Sort by
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as TaskSortField)}
              data-testid="wk-task-sort-select"
            >
              <option value="due">Due date</option>
              <option value="status">Status</option>
              <option value="priority">Priority</option>
              <option value="title">Title</option>
            </select>
          </label>
        )}
        <label>
          Group by
          <select
            value={group}
            onChange={(e) => setGroup(e.target.value as TaskGroupField)}
            data-testid="wk-task-group-select"
          >
            <option value="none">None</option>
            <option value="code">Project (code)</option>
            <option value="status">Status</option>
            <option value="priority">Priority</option>
            <option value="due">Due date</option>
          </select>
        </label>
      </div>

      {loading ? (
        <div className="wk-loading">Loading…</div>
      ) : view === 'board' ? (
        // Shown even with no tasks so columns can still be edited from the kanban (BIZ-057).
        <TaskBoard
          tasks={visibleTasks}
          codesById={codesById}
          states={taskStates}
          stateEdits={group === 'code' ? undefined : stateEdits}
          groupByCode={group === 'code'}
          onNewInCode={onNewInCode}
          onOpenTask={onOpenTask}
          onMoveTask={onMoveTask ?? (() => {})}
          onStartTask={onStartTask}
          doneCollapsed={preferences?.done_collapsed}
          onDoneCollapsedChange={
            onPreferencesChange
              ? (collapsed) => onPreferencesChange({ done_collapsed: collapsed })
              : undefined
          }
        />
      ) : visibleTasks.length === 0 ? (
        <div className="wk-modal-empty">
          {focus
            ? 'Nothing needs attention right now — nothing overdue, due today, or high priority.'
            : 'No tasks yet. Use “New task” to capture one.'}
        </div>
      ) : (
        // BIZ-051: one table with per-group section rows, so columns stay aligned across groups.
        <table className="wk-task-table" data-testid="wk-task-table">
          <thead>
            <tr>
              {sortHeader('title', 'Title')}
              {sortHeader('status', 'Status')}
              {showCode && <th>Code</th>}
              {onStartTask && <th />}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <Fragment key={g.label ?? 'all'}>
                {g.label && (
                  <tr className="wk-task-group-row">
                    <td colSpan={columnCount}>
                      <div className="wk-task-group-title">
                        <span>{g.label}</span>
                        {group === 'code' && onNewInCode && (
                          <button
                            type="button"
                            className="wk-btn-icon wk-task-group-add"
                            title={`Add a task in ${g.label}`}
                            aria-label={`Add a task in ${g.label}`}
                            data-testid={`wk-task-group-add-${g.items[0]?.codeId ?? 'none'}`}
                            onClick={() => onNewInCode(g.items[0]?.codeId ?? null)}
                          >
                            +
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                {g.items.map(renderRow)}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
