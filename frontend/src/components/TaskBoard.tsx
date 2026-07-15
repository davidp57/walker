import { useMemo, useRef, useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from '@dnd-kit/core'
import type { Task, TaskState, TimesheetCode } from '../types'
import { DEFAULT_TASK_STATES } from '../types'
import { IconPlay } from './icons'
import { describeDue } from '../lib/dueDate'

/** In-kanban column-editing callbacks (BIZ-057); omit to render a read-only board. */
export interface TaskStateEdits {
  onAdd: (label: string) => void // insert a column (backend puts it before the terminal)
  onRename: (id: string, label: string) => void
  onReorder: (orderedIds: string[]) => void
  onDelete: (id: string, reassignTo?: string) => void
}

interface StatusBoardProps {
  tasks: Task[]
  codesById: Record<string, TimesheetCode>
  states?: TaskState[] // the user's ordered states — columns, in order (BIZ-056); defaults to the five
  stateEdits?: TaskStateEdits // present ⇒ show the column-editing controls
  onOpenTask: (task: Task) => void
  onMoveTask: (task: Task, status: string) => void
  onStartTask?: (task: Task) => void
  // BIZ-053: controlled collapsed-terminal state (persisted). Omit both to keep it local (BIZ-044).
  doneCollapsed?: boolean
  onDoneCollapsedChange?: (collapsed: boolean) => void
}

export interface TaskBoardProps extends StatusBoardProps {
  /** Split the board into one swimlane per project (code), plus a "No project" lane (BIZ-036). */
  groupByCode?: boolean
  // BIZ-067: "Add" a Task straight into a project swimlane, prefilled with that lane's code (null
  // for the "No project" lane). Only used when `groupByCode`; omit to hide the per-lane Add.
  onNewInCode?: (codeId: string | null) => void
}

/**
 * Keyboard-drag coordinate getter: arrow keys jump between the centers of the droppable columns in
 * the user's state order (BIZ-056), so the drag path stays operable from the keyboard and reachable
 * in jsdom tests via plain `fireEvent.keyDown`. `atStatus` tracks the drag's current column.
 */
function makeColumnCoordinateGetter(
  order: string[],
  atStatus: { current: string | null },
): KeyboardCoordinateGetter {
  return (event, { currentCoordinates, context }) => {
    const fromIndex = atStatus.current ? order.indexOf(atStatus.current) : -1

    let targetStatus: string | undefined
    if (event.code === 'ArrowRight' || event.code === 'ArrowDown') {
      targetStatus = order[fromIndex + 1]
    } else if (event.code === 'ArrowLeft' || event.code === 'ArrowUp') {
      targetStatus = order[fromIndex - 1]
    }
    if (!targetStatus) return undefined

    const container = context.droppableContainers.get(targetStatus)
    const rect = container?.rect.current
    if (!rect) return currentCoordinates

    atStatus.current = targetStatus
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  }
}

interface BoardColumnProps {
  state: TaskState
  count: number
  isDropTarget: boolean
  isFirst: boolean // the initial-role column (ADR-0011) — marked "start"
  isLast: boolean // the terminal-role column — marked "done", collapsible
  collapsed?: boolean // BIZ-044: render a narrow rail (header + count only), no card body
  onToggle?: () => void // present ⇒ the header is a collapse/expand toggle
  edits?: TaskStateEdits
  canDelete: boolean // false when only the 2-state minimum remains (ADR-0011)
  canMoveLeft: boolean
  canMoveRight: boolean
  onMoveLeft: () => void
  onMoveRight: () => void
  onRequestDelete: () => void
  children: React.ReactNode
}

/** A status column, also a `@dnd-kit` drop target — highlighted while a card is dragged over it. */
function BoardColumn({
  state,
  count,
  isDropTarget,
  isFirst,
  isLast,
  collapsed = false,
  onToggle,
  edits,
  canDelete,
  canMoveLeft,
  canMoveRight,
  onMoveLeft,
  onMoveRight,
  onRequestDelete,
  children,
}: BoardColumnProps) {
  const { setNodeRef } = useDroppable({ id: state.id })
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(state.label)
  const cls = [
    'wk-board-column',
    isDropTarget ? 'is-drop-target' : '',
    collapsed ? 'is-collapsed' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const commitRename = () => {
    setRenaming(false)
    const next = draft.trim()
    if (next && next !== state.label) edits?.onRename(state.id, next)
    else setDraft(state.label)
  }

  const roleMark = isFirst ? 'start' : isLast ? 'done' : null

  return (
    <div ref={setNodeRef} className={cls} data-testid={`wk-board-column-${state.id}`}>
      <div
        className="wk-board-column-head"
        onClick={onToggle}
        style={onToggle ? { cursor: 'pointer' } : undefined}
        title={onToggle ? (collapsed ? 'Expand' : 'Collapse') : undefined}
        data-testid={onToggle ? `wk-board-column-toggle-${state.id}` : undefined}
      >
        <span className="wk-board-column-title">
          {renaming && edits ? (
            <input
              className="wk-input wk-board-column-rename"
              value={draft}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename()
                if (e.key === 'Escape') {
                  setDraft(state.label)
                  setRenaming(false)
                }
              }}
              data-testid={`wk-board-column-rename-input-${state.id}`}
            />
          ) : (
            <span>
              {state.label}
              {roleMark && <span className="wk-board-column-role"> · {roleMark}</span>}
              {onToggle ? (collapsed ? ' ▸' : ' ▾') : ''}
            </span>
          )}
        </span>
        <span className="wk-board-column-count">{count}</span>
      </div>

      {edits && !collapsed && (
        <div className="wk-board-column-tools" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="wk-btn-icon"
            title="Move column left"
            disabled={!canMoveLeft}
            onClick={onMoveLeft}
            data-testid={`wk-board-column-move-left-${state.id}`}
          >
            ◀
          </button>
          <button
            type="button"
            className="wk-btn-icon"
            title="Rename column"
            onClick={() => {
              setDraft(state.label)
              setRenaming(true)
            }}
            data-testid={`wk-board-column-rename-${state.id}`}
          >
            ✎
          </button>
          <button
            type="button"
            className="wk-btn-icon"
            title={canDelete ? 'Delete column' : 'At least two columns are required'}
            disabled={!canDelete}
            onClick={onRequestDelete}
            data-testid={`wk-board-column-delete-${state.id}`}
          >
            ✕
          </button>
          <button
            type="button"
            className="wk-btn-icon"
            title="Move column right"
            disabled={!canMoveRight}
            onClick={onMoveRight}
            data-testid={`wk-board-column-move-right-${state.id}`}
          >
            ▶
          </button>
        </div>
      )}

      {!collapsed && <div className="wk-board-column-body">{children}</div>}
    </div>
  )
}

interface BoardCardProps {
  task: Task
  code: TimesheetCode | null
  today: string // ISO YYYY-MM-DD, for the relative due label (BIZ-062)
  prevState: TaskState | null
  nextState: TaskState | null
  terminal: TaskState | null
  onOpenTask: (task: Task) => void
  onMoveTask: (task: Task, status: string) => void
  onStartTask?: (task: Task) => void
}

/** A Task card, also a `@dnd-kit` draggable — the drag handle keeps click-to-move controls intact. */
function BoardCard({
  task,
  code,
  today,
  prevState,
  nextState,
  terminal,
  onOpenTask,
  onMoveTask,
  onStartTask,
}: BoardCardProps) {
  const due = task.dueDate ? describeDue(task.dueDate, today) : null
  // Overdue or due today, unless the task is done (terminal state is never flagged — ADR-0011).
  const flagged = due !== null && (due.overdue || due.dueToday) && task.status !== terminal?.id
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } =
    useDraggable({ id: task.id })
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? 'wk-board-card is-dragging' : 'wk-board-card'}
      data-testid={`wk-board-card-${task.id}`}
    >
      <div className="wk-board-card-head">
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="wk-board-drag-handle"
          data-testid={`wk-board-card-drag-${task.id}`}
          aria-label={`Drag "${task.title}" to another column`}
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        <div
          className="wk-board-card-title"
          onClick={() => onOpenTask(task)}
          data-testid={`wk-board-card-open-${task.id}`}
        >
          {task.title}
        </div>
        {/* BIZ-050: one-click start-timer, mirroring the drag handle on the opposite corner. */}
        {onStartTask && (
          <button
            type="button"
            className="wk-board-card-start"
            title="Start a timer from this task"
            data-testid={`wk-board-card-start-${task.id}`}
            onClick={() => onStartTask(task)}
          >
            <IconPlay />
          </button>
        )}
      </div>
      <div className="wk-board-card-meta">
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
        {code && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span className="wk-dot" style={{ width: 8, height: 8, background: code.color }} />
            {code.name}
          </span>
        )}
      </div>
      <div className="wk-board-card-controls">
        {prevState && (
          <button
            type="button"
            className="wk-btn-ghost wk-board-move-btn"
            onClick={() => onMoveTask(task, prevState.id)}
            data-testid={`wk-board-card-move-prev-${task.id}`}
            aria-label={`Move "${task.title}" back to ${prevState.label}`}
          >
            ← {prevState.label}
          </button>
        )}
        {nextState && (
          <button
            type="button"
            className="wk-btn-ghost wk-board-move-btn"
            onClick={() => onMoveTask(task, nextState.id)}
            data-testid={`wk-board-card-move-next-${task.id}`}
            aria-label={`Move "${task.title}" to ${nextState.label}`}
          >
            {nextState.label} →
          </button>
        )}
        {terminal && task.status !== terminal.id && (
          <button
            type="button"
            className="wk-btn-ghost wk-board-move-btn"
            onClick={() => onMoveTask(task, terminal.id)}
            data-testid={`wk-board-card-move-done-${task.id}`}
            aria-label={`Move "${task.title}" straight to ${terminal.label}`}
          >
            ✓ {terminal.label}
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * The status-column board (BIZ-022), now over the user's dynamic state list (BIZ-056/057). Columns,
 * their labels and order come from `states`; when `stateEdits` is supplied the column headers gain
 * add/rename/move/delete controls (the initial and terminal columns are marked start/done, and the
 * roles follow whichever columns sit first/last — ADR-0011).
 *
 * Moving a Task supports drag-and-drop (`@dnd-kit/core`) and the click-to-move controls kept as a
 * keyboard/accessibility fallback (BIZ-026); the keyboard sensor walks the columns in state order.
 */
function StatusBoard({
  tasks,
  codesById,
  states = DEFAULT_TASK_STATES,
  stateEdits,
  onOpenTask,
  onMoveTask,
  onStartTask,
  doneCollapsed: doneCollapsedProp,
  onDoneCollapsedChange,
}: StatusBoardProps) {
  const [overStatus, setOverStatus] = useState<string | null>(null)
  const [localDoneCollapsed, setLocalDoneCollapsed] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<{ id: string; reassignTo: string } | null>(
    null,
  )
  const doneCollapsed = doneCollapsedProp ?? localDoneCollapsed
  const setDoneCollapsed = (collapsed: boolean) =>
    onDoneCollapsedChange ? onDoneCollapsedChange(collapsed) : setLocalDoneCollapsed(collapsed)
  const atStatusRef = useRef<string | null>(null)
  const order = useMemo(() => states.map((s) => s.id), [states])
  const coordinateGetter = useMemo(() => makeColumnCoordinateGetter(order, atStatusRef), [order])
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter }),
  )

  const byStatus = (status: string) => tasks.filter((t) => t.status === status)
  const today = new Date().toISOString().slice(0, 10)

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id)
    atStatusRef.current = task?.status ?? null
    setOverStatus(task?.status ?? null)
  }
  const handleDragOver = (event: DragOverEvent) => {
    setOverStatus((event.over?.id as string | undefined) ?? null)
  }
  const handleDragEnd = (event: DragEndEvent) => {
    setOverStatus(null)
    atStatusRef.current = null
    const status = event.over?.id as string | undefined
    if (!status) return
    const task = tasks.find((t) => t.id === event.active.id)
    if (!task || task.status === status) return
    onMoveTask(task, status)
  }
  const handleDragCancel = () => {
    setOverStatus(null)
    atStatusRef.current = null
  }

  const move = (index: number, delta: number) => {
    const next = [...states]
    const [moved] = next.splice(index, 1)
    next.splice(index + delta, 0, moved)
    stateEdits?.onReorder(next.map((s) => s.id))
  }

  const requestDelete = (state: TaskState, count: number) => {
    if (count === 0) {
      stateEdits?.onDelete(state.id)
      return
    }
    // Non-empty: prompt for where its tasks go (default: a neighbour).
    const neighbour = states.find((s) => s.id !== state.id)
    setPendingDelete({ id: state.id, reassignTo: neighbour?.id ?? '' })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="wk-board">
        {states.map((state, index) => {
          const isFirst = index === 0
          const isLast = index === states.length - 1
          const prevState = index > 0 ? states[index - 1] : null
          const nextState = index < states.length - 1 ? states[index + 1] : null
          const terminal = states[states.length - 1] ?? null
          const columnTasks = byStatus(state.id)

          return (
            <BoardColumn
              key={state.id}
              state={state}
              count={columnTasks.length}
              isDropTarget={overStatus === state.id}
              isFirst={isFirst}
              isLast={isLast}
              collapsed={isLast && doneCollapsed}
              onToggle={isLast ? () => setDoneCollapsed(!doneCollapsed) : undefined}
              edits={stateEdits}
              canDelete={states.length > 2}
              canMoveLeft={!isFirst}
              canMoveRight={!isLast}
              onMoveLeft={() => move(index, -1)}
              onMoveRight={() => move(index, 1)}
              onRequestDelete={() => requestDelete(state, columnTasks.length)}
            >
              {columnTasks.map((task) => {
                const code = task.codeId ? (codesById[task.codeId] ?? null) : null
                return (
                  <BoardCard
                    key={task.id}
                    task={task}
                    code={code}
                    today={today}
                    prevState={prevState}
                    nextState={nextState}
                    terminal={terminal}
                    onOpenTask={onOpenTask}
                    onMoveTask={onMoveTask}
                    onStartTask={onStartTask}
                  />
                )
              })}
            </BoardColumn>
          )
        })}

        {stateEdits && (
          <button
            type="button"
            className="wk-board-add-column"
            data-testid="wk-board-add-column"
            title="Add a column (inserted before the last)"
            onClick={() => {
              const label = window.prompt('New column name')?.trim()
              if (label) stateEdits.onAdd(label)
            }}
          >
            + column
          </button>
        )}
      </div>

      {pendingDelete && (
        <div className="wk-overlay" onClick={() => setPendingDelete(null)}>
          <div className="wk-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="wk-modal-head">
              <span className="wk-modal-title">Delete column</span>
              <button
                type="button"
                className="wk-modal-close"
                onClick={() => setPendingDelete(null)}
              >
                ✕
              </button>
            </div>
            <div
              style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <div className="wk-screen-sub">
                This column has tasks. Move them to which column before deleting?
              </div>
              <select
                className="wk-input"
                value={pendingDelete.reassignTo}
                data-testid="wk-board-delete-reassign"
                onChange={(e) => setPendingDelete({ ...pendingDelete, reassignTo: e.target.value })}
              >
                {states
                  .filter((s) => s.id !== pendingDelete.id)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
              </select>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="wk-btn-ghost"
                  onClick={() => setPendingDelete(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="wk-btn wk-btn-danger"
                  style={{ padding: '10px 18px' }}
                  data-testid="wk-board-delete-confirm"
                  onClick={() => {
                    stateEdits?.onDelete(pendingDelete.id, pendingDelete.reassignTo)
                    setPendingDelete(null)
                  }}
                >
                  Delete &amp; move
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DndContext>
  )
}

interface Lane {
  key: string // codeId, or "none" for tasks without a code
  label: string
  tasks: Task[]
}

/**
 * Bucket tasks into project (code) swimlanes, ordered by code name ascending with the "No project"
 * lane last (BIZ-036). A task whose code is not in the active set falls back to its code id.
 */
function laneOrder(tasks: Task[], codesById: Record<string, TimesheetCode>): Lane[] {
  const byKey = new Map<string, Lane>()
  for (const task of tasks) {
    const key = task.codeId ?? 'none'
    const label = task.codeId ? (codesById[task.codeId]?.name ?? task.codeId) : 'No project'
    const lane = byKey.get(key) ?? { key, label, tasks: [] }
    lane.tasks.push(task)
    byKey.set(key, lane)
  }
  return [...byKey.values()].sort((a, b) => {
    if (a.key === 'none') return 1
    if (b.key === 'none') return -1
    return a.label.localeCompare(b.label)
  })
}

/**
 * Kanban board over the same Tasks as the list (BIZ-022). By default a single status-column board
 * with in-kanban column editing (BIZ-057); with `groupByCode` (BIZ-036) it splits into project
 * swimlanes — each a read-only status board (column editing stays on the single-board view).
 */
export function TaskBoard({
  tasks,
  codesById,
  states = DEFAULT_TASK_STATES,
  stateEdits,
  onOpenTask,
  onMoveTask,
  onStartTask,
  doneCollapsed,
  onDoneCollapsedChange,
  groupByCode = false,
  onNewInCode,
}: TaskBoardProps) {
  if (!groupByCode) {
    return (
      <StatusBoard
        tasks={tasks}
        codesById={codesById}
        states={states}
        stateEdits={stateEdits}
        onOpenTask={onOpenTask}
        onMoveTask={onMoveTask}
        onStartTask={onStartTask}
        doneCollapsed={doneCollapsed}
        onDoneCollapsedChange={onDoneCollapsedChange}
      />
    )
  }

  return (
    <div className="wk-board-lanes">
      {laneOrder(tasks, codesById).map((lane) => (
        <div key={lane.key} className="wk-board-lane" data-testid={`wk-board-lane-${lane.key}`}>
          <div className="wk-board-lane-head">
            <span>{lane.label}</span>
            {onNewInCode && (
              <button
                type="button"
                className="wk-btn-icon wk-board-lane-add"
                title={`Add a task in ${lane.label}`}
                aria-label={`Add a task in ${lane.label}`}
                data-testid={`wk-board-lane-add-${lane.key}`}
                onClick={() => onNewInCode(lane.key === 'none' ? null : lane.key)}
              >
                +
              </button>
            )}
          </div>
          <StatusBoard
            tasks={lane.tasks}
            codesById={codesById}
            states={states}
            onOpenTask={onOpenTask}
            onMoveTask={onMoveTask}
            onStartTask={onStartTask}
            doneCollapsed={doneCollapsed}
            onDoneCollapsedChange={onDoneCollapsedChange}
          />
        </div>
      ))}
    </div>
  )
}
