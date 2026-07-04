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
import type { Task, TaskStatus, TimesheetCode } from '../types'

interface TaskBoardProps {
  tasks: Task[]
  codesById: Record<string, TimesheetCode>
  onOpenTask: (task: Task) => void
  onMoveTask: (task: Task, status: TaskStatus) => void
}

const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'waiting', 'test', 'done']
const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'To-do',
  in_progress: 'In progress',
  waiting: 'Waiting',
  test: 'Test',
  done: 'Done',
}

/**
 * Builds a keyboard-drag coordinate getter for the board: rather than nudging by a pixel offset
 * (fragile across column widths, and meaningless in a jsdom test where layout isn't computed),
 * arrow keys jump directly between the centers of the droppable columns in `STATUS_ORDER`. `atStatus`
 * tracks which column the drag is currently "at" (source column on lift, then wherever the last
 * move landed) so repeated arrow presses keep walking the column order. This keeps the keyboard
 * drag path — Space to lift, arrows to move, Space to drop, Escape to cancel — reachable from
 * Testing Library via plain `fireEvent.keyDown` calls.
 */
function makeColumnCoordinateGetter(atStatus: {
  current: TaskStatus | null
}): KeyboardCoordinateGetter {
  return (event, { currentCoordinates, context }) => {
    const fromIndex = atStatus.current ? STATUS_ORDER.indexOf(atStatus.current) : -1

    let targetStatus: TaskStatus | undefined
    if (event.code === 'ArrowRight' || event.code === 'ArrowDown') {
      targetStatus = STATUS_ORDER[fromIndex + 1]
    } else if (event.code === 'ArrowLeft' || event.code === 'ArrowUp') {
      targetStatus = STATUS_ORDER[fromIndex - 1]
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
  status: TaskStatus
  count: number
  isDropTarget: boolean
  children: React.ReactNode
}

/** A status column, also a `@dnd-kit` drop target — highlighted while a card is dragged over it. */
function BoardColumn({ status, count, isDropTarget, children }: BoardColumnProps) {
  const { setNodeRef } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      className={isDropTarget ? 'wk-board-column is-drop-target' : 'wk-board-column'}
      data-testid={`wk-board-column-${status}`}
    >
      <div className="wk-board-column-head">
        <span>{STATUS_LABEL[status]}</span>
        <span className="wk-board-column-count">{count}</span>
      </div>
      <div className="wk-board-column-body">{children}</div>
    </div>
  )
}

interface BoardCardProps {
  task: Task
  code: TimesheetCode | null
  prevStatus: TaskStatus | null
  nextStatus: TaskStatus | null
  onOpenTask: (task: Task) => void
  onMoveTask: (task: Task, status: TaskStatus) => void
}

/** A Task card, also a `@dnd-kit` draggable — the drag handle keeps click-to-move controls intact. */
function BoardCard({ task, code, prevStatus, nextStatus, onOpenTask, onMoveTask }: BoardCardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
    })
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 10,
      }
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
      </div>
      <div className="wk-board-card-meta">
        {task.priority && (
          <span className={`wk-task-priority is-${task.priority}`}>{task.priority}</span>
        )}
        {code && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span className="wk-dot" style={{ width: 8, height: 8, background: code.color }} />
            {code.name}
          </span>
        )}
      </div>
      <div className="wk-board-card-controls">
        {prevStatus && (
          <button
            type="button"
            className="wk-btn-ghost wk-board-move-btn"
            onClick={() => onMoveTask(task, prevStatus)}
            data-testid={`wk-board-card-move-prev-${task.id}`}
            aria-label={`Move "${task.title}" back to ${STATUS_LABEL[prevStatus]}`}
          >
            ← {STATUS_LABEL[prevStatus]}
          </button>
        )}
        {nextStatus && (
          <button
            type="button"
            className="wk-btn-ghost wk-board-move-btn"
            onClick={() => onMoveTask(task, nextStatus)}
            data-testid={`wk-board-card-move-next-${task.id}`}
            aria-label={`Move "${task.title}" to ${STATUS_LABEL[nextStatus]}`}
          >
            {STATUS_LABEL[nextStatus]} →
          </button>
        )}
        {task.status !== 'done' && (
          <button
            type="button"
            className="wk-btn-ghost wk-board-move-btn"
            onClick={() => onMoveTask(task, 'done')}
            data-testid={`wk-board-card-move-done-${task.id}`}
            aria-label={`Move "${task.title}" straight to Done`}
          >
            ✓ Done
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Kanban board over the same Tasks as the list (BIZ-022) — fixed columns = the status workflow.
 *
 * Moving a Task across columns supports both drag-and-drop (`@dnd-kit/core`, modeled after Azure
 * DevOps boards — pick up a card, drag it over a column, drop to change status) and the original
 * click-to-move controls, kept as a keyboard/accessibility fallback (BIZ-026). `@dnd-kit`'s keyboard
 * sensor also makes the drag path itself operable without a pointer: focus a card's drag handle,
 * Space to lift, arrow keys to move between columns, Space to drop (Escape cancels).
 */
export function TaskBoard({ tasks, codesById, onOpenTask, onMoveTask }: TaskBoardProps) {
  const [overStatus, setOverStatus] = useState<TaskStatus | null>(null)
  const atStatusRef = useRef<TaskStatus | null>(null)
  const coordinateGetter = useMemo(() => makeColumnCoordinateGetter(atStatusRef), [])
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter }),
  )

  const byStatus = (status: TaskStatus) => tasks.filter((t) => t.status === status)

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id)
    atStatusRef.current = task?.status ?? null
    setOverStatus(task?.status ?? null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const status = event.over?.id as TaskStatus | undefined
    setOverStatus(status ?? null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setOverStatus(null)
    atStatusRef.current = null
    const status = event.over?.id as TaskStatus | undefined
    if (!status) return
    const task = tasks.find((t) => t.id === event.active.id)
    if (!task || task.status === status) return
    onMoveTask(task, status)
  }

  const handleDragCancel = () => {
    setOverStatus(null)
    atStatusRef.current = null
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
        {STATUS_ORDER.map((status) => {
          const index = STATUS_ORDER.indexOf(status)
          const prevStatus = index > 0 ? STATUS_ORDER[index - 1] : null
          const nextStatus = index < STATUS_ORDER.length - 1 ? STATUS_ORDER[index + 1] : null
          const columnTasks = byStatus(status)

          return (
            <BoardColumn
              key={status}
              status={status}
              count={columnTasks.length}
              isDropTarget={overStatus === status}
            >
              {columnTasks.map((task) => {
                const code = task.codeId ? (codesById[task.codeId] ?? null) : null
                return (
                  <BoardCard
                    key={task.id}
                    task={task}
                    code={code}
                    prevStatus={prevStatus}
                    nextStatus={nextStatus}
                    onOpenTask={onOpenTask}
                    onMoveTask={onMoveTask}
                  />
                )
              })}
            </BoardColumn>
          )
        })}
      </div>
    </DndContext>
  )
}
