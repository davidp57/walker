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
 * Kanban board over the same Tasks as the list (BIZ-022) — fixed columns = the status workflow.
 *
 * Moving a Task across columns uses click-to-move controls rather than drag-and-drop: they are
 * keyboard- and Testing-Library-friendly, and the acceptance criteria only require that a move
 * updates status, not a specific interaction mechanism. Every card also gets a direct "Done"
 * shortcut so a trivial Task can skip Waiting/Test in one click, per the ticket.
 */
export function TaskBoard({ tasks, codesById, onOpenTask, onMoveTask }: TaskBoardProps) {
  const byStatus = (status: TaskStatus) => tasks.filter((t) => t.status === status)

  return (
    <div className="wk-board">
      {STATUS_ORDER.map((status) => {
        const index = STATUS_ORDER.indexOf(status)
        const prevStatus = index > 0 ? STATUS_ORDER[index - 1] : null
        const nextStatus = index < STATUS_ORDER.length - 1 ? STATUS_ORDER[index + 1] : null
        const columnTasks = byStatus(status)

        return (
          <div className="wk-board-column" key={status} data-testid={`wk-board-column-${status}`}>
            <div className="wk-board-column-head">
              <span>{STATUS_LABEL[status]}</span>
              <span className="wk-board-column-count">{columnTasks.length}</span>
            </div>
            <div className="wk-board-column-body">
              {columnTasks.map((task) => {
                const code = task.codeId ? (codesById[task.codeId] ?? null) : null
                return (
                  <div
                    className="wk-board-card"
                    key={task.id}
                    data-testid={`wk-board-card-${task.id}`}
                  >
                    <div
                      className="wk-board-card-title"
                      onClick={() => onOpenTask(task)}
                      data-testid={`wk-board-card-open-${task.id}`}
                    >
                      {task.title}
                    </div>
                    <div className="wk-board-card-meta">
                      {task.priority && (
                        <span className={`wk-task-priority is-${task.priority}`}>
                          {task.priority}
                        </span>
                      )}
                      {code && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span
                            className="wk-dot"
                            style={{ width: 8, height: 8, background: code.color }}
                          />
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
                      {status !== 'done' && (
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
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
