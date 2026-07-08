import { useMemo, useState } from 'react'
import type { Task, TaskStatus, TimesheetCode } from '../types'
import { IconPlay } from '../components/icons'
import { TaskBoard } from '../components/TaskBoard'

export type TaskSortField = 'status' | 'priority' | 'due' | 'title'
export type TaskGroupField = 'none' | 'status' | 'priority' | 'due' | 'code'
export type TaskViewMode = 'list' | 'board'

interface TasksScreenProps {
  tasks: Task[]
  codesById: Record<string, TimesheetCode>
  loading?: boolean
  onNew: () => void
  onOpenTask: (task: Task) => void
  // Start a Timer from this Task (BIZ-023) — title as comment, code prefilled. Omit to hide the
  // row action (e.g. a read-only context).
  onStartTask?: (task: Task) => void
  /** Called when a Task is moved to another column on the board (BIZ-022). */
  onMoveTask?: (task: Task, status: TaskStatus) => void
}

const STATUS_LABEL: Record<Task['status'], string> = {
  todo: 'To-do',
  in_progress: 'In progress',
  waiting: 'Waiting',
  test: 'Test',
  done: 'Done',
}
const STATUS_ORDER: Task['status'][] = ['todo', 'in_progress', 'waiting', 'test', 'done']
const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

function dueGroupLabel(dueDate: string | null, today: string): string {
  if (!dueDate) return 'No due date'
  if (dueDate < today) return 'Overdue'
  if (dueDate === today) return 'Today'
  return 'Upcoming'
}

function compareTasks(a: Task, b: Task, field: TaskSortField): number {
  switch (field) {
    case 'title':
      return a.title.localeCompare(b.title)
    case 'status':
      return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
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
): string {
  switch (field) {
    case 'status':
      return STATUS_LABEL[task.status]
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
  loading = false,
  onNew,
  onOpenTask,
  onStartTask,
  onMoveTask,
}: TasksScreenProps) {
  const [view, setView] = useState<TaskViewMode>('list')
  const [sort, setSort] = useState<TaskSortField>('due')
  const [sortDir, setSortDir] = useState<1 | -1>(1)
  const [group, setGroup] = useState<TaskGroupField>('none')
  const today = new Date().toISOString().slice(0, 10)

  const toggleSort = (field: TaskSortField) => {
    if (field === sort) {
      setSortDir((d) => (d === 1 ? -1 : 1))
    } else {
      setSort(field)
      setSortDir(1)
    }
  }

  const sorted = useMemo(
    () => [...tasks].sort((a, b) => sortDir * compareTasks(a, b, sort)),
    [tasks, sort, sortDir],
  )

  const groups = useMemo(() => {
    if (group === 'none') return [{ label: null as string | null, items: sorted }]
    const byKey = new Map<string, Task[]>()
    for (const task of sorted) {
      const key = groupKeyFor(task, group, today, codesById)
      const list = byKey.get(key) ?? []
      list.push(task)
      byKey.set(key, list)
    }
    const entries = [...byKey.entries()].map(([label, items]) => ({ label, items }))
    // Grouping by project (code) orders lanes by code name ascending, "No project" last (BIZ-036);
    // the other groupings keep first-appearance order.
    if (group === 'code') {
      entries.sort((a, b) => {
        if (a.label === NO_PROJECT) return 1
        if (b.label === NO_PROJECT) return -1
        return a.label.localeCompare(b.label)
      })
    }
    return entries
  }, [sorted, group, today, codesById])

  const sortHeader = (field: TaskSortField, label: string) => (
    <th
      className={sort === field ? 'is-sorted' : undefined}
      onClick={() => toggleSort(field)}
      data-testid={`wk-task-sort-${field}`}
    >
      {label}
      {sort === field ? (sortDir === 1 ? ' ▲' : ' ▼') : ''}
    </th>
  )

  const renderRow = (task: Task) => {
    const code = task.codeId ? (codesById[task.codeId] ?? null) : null
    const overdue = task.dueDate !== null && task.dueDate < today && task.status !== 'done'
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
              {task.dueDate && (
                <span className={overdue ? 'wk-task-due is-overdue' : 'wk-task-due'}>
                  {task.dueDate}
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
              className={`wk-task-status-select is-${task.status}`}
              value={task.status}
              data-testid={`wk-task-status-select-${task.id}`}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onMoveTask(task, e.target.value as TaskStatus)}
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          ) : (
            <span className={`wk-task-status is-${task.status}`}>{STATUS_LABEL[task.status]}</span>
          )}
        </td>
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
        {onStartTask && (
          <td>
            <button
              type="button"
              className="wk-btn-icon"
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
      ) : tasks.length === 0 ? (
        <div className="wk-modal-empty">No tasks yet. Use “New task” to capture one.</div>
      ) : view === 'board' ? (
        <TaskBoard
          tasks={tasks}
          codesById={codesById}
          groupByCode={group === 'code'}
          onOpenTask={onOpenTask}
          onMoveTask={onMoveTask ?? (() => {})}
        />
      ) : (
        groups.map((g) => (
          <div className="wk-task-group" key={g.label ?? 'all'}>
            {g.label && <div className="wk-task-group-title">{g.label}</div>}
            <table className="wk-task-table" data-testid="wk-task-table">
              <thead>
                <tr>
                  {sortHeader('title', 'Title')}
                  {sortHeader('status', 'Status')}
                  <th>Code</th>
                  {onStartTask && <th />}
                </tr>
              </thead>
              <tbody>{g.items.map(renderRow)}</tbody>
            </table>
          </div>
        ))
      )}
    </div>
  )
}
