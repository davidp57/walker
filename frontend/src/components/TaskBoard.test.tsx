import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { TaskBoard } from './TaskBoard'
import type { Task } from '../types'

const STATUS_COLUMN_ORDER = ['todo', 'in_progress', 'waiting', 'test', 'done']

/**
 * `@dnd-kit`'s keyboard sensor drives drag movement off real `getBoundingClientRect` measurements,
 * which jsdom always reports as a zero rect. Stub distinct, side-by-side rects per board column
 * (keyed by its `data-testid`) so the board's keyboard coordinate getter can resolve a real target
 * column, exactly as it would in a browser laying the columns out left to right.
 */
function stubColumnRects(): void {
  const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const testId = this.getAttribute('data-testid') ?? ''
    const match = /^wk-board-column-(.+)$/.exec(testId)
    if (!match) return originalGetBoundingClientRect.call(this)
    const index = STATUS_COLUMN_ORDER.indexOf(match[1])
    const left = index * 240
    return {
      x: left,
      y: 0,
      left,
      top: 0,
      right: left + 220,
      bottom: 400,
      width: 220,
      height: 400,
      toJSON: () => ({}),
    }
  })
}

/**
 * `@dnd-kit`'s `KeyboardSensor` attaches its keydown listener via a `setTimeout(0)` right after
 * activation (see its `attach()`), so the very next synchronous `fireEvent.keyDown` after the
 * activating Space would be missed. Flush that timer between keystrokes.
 */
function flushTimers(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: '1',
    title: 'Untitled',
    description: '',
    status: 'todo',
    priority: null,
    dueDate: null,
    tags: [],
    codeId: null,
    recurrenceRule: null,
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
    ...overrides,
  }
}

describe('TaskBoard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the five fixed status columns', () => {
    render(<TaskBoard tasks={[]} codesById={{}} onOpenTask={vi.fn()} onMoveTask={vi.fn()} />)

    expect(screen.getByTestId('wk-board-column-todo')).toBeInTheDocument()
    expect(screen.getByTestId('wk-board-column-in_progress')).toBeInTheDocument()
    expect(screen.getByTestId('wk-board-column-waiting')).toBeInTheDocument()
    expect(screen.getByTestId('wk-board-column-test')).toBeInTheDocument()
    expect(screen.getByTestId('wk-board-column-done')).toBeInTheDocument()
  })

  it('places each task under its status column', () => {
    const tasks = [
      makeTask({ id: '1', title: 'Todo task', status: 'todo' }),
      makeTask({ id: '2', title: 'Doing task', status: 'in_progress' }),
      makeTask({ id: '3', title: 'Done task', status: 'done' }),
    ]
    render(<TaskBoard tasks={tasks} codesById={{}} onOpenTask={vi.fn()} onMoveTask={vi.fn()} />)

    expect(
      within(screen.getByTestId('wk-board-column-todo')).getByText('Todo task'),
    ).toBeInTheDocument()
    expect(
      within(screen.getByTestId('wk-board-column-in_progress')).getByText('Doing task'),
    ).toBeInTheDocument()
    expect(
      within(screen.getByTestId('wk-board-column-done')).getByText('Done task'),
    ).toBeInTheDocument()
  })

  it('calls onOpenTask when a card is clicked', () => {
    const onOpenTask = vi.fn()
    const task = makeTask({ id: '7', title: 'Fix bug' })
    render(<TaskBoard tasks={[task]} codesById={{}} onOpenTask={onOpenTask} onMoveTask={vi.fn()} />)

    fireEvent.click(screen.getByText('Fix bug'))

    expect(onOpenTask).toHaveBeenCalledWith(task)
  })

  it('moves a task to the next column via the move-forward control', () => {
    const onMoveTask = vi.fn()
    const task = makeTask({ id: '1', title: 'Todo task', status: 'todo' })
    render(<TaskBoard tasks={[task]} codesById={{}} onOpenTask={vi.fn()} onMoveTask={onMoveTask} />)

    fireEvent.click(screen.getByTestId('wk-board-card-move-next-1'))

    expect(onMoveTask).toHaveBeenCalledWith(task, 'in_progress')
  })

  it('moves a task backward via the move-back control', () => {
    const onMoveTask = vi.fn()
    const task = makeTask({ id: '1', title: 'Doing task', status: 'in_progress' })
    render(<TaskBoard tasks={[task]} codesById={{}} onOpenTask={vi.fn()} onMoveTask={onMoveTask} />)

    fireEvent.click(screen.getByTestId('wk-board-card-move-prev-1'))

    expect(onMoveTask).toHaveBeenCalledWith(task, 'todo')
  })

  it('lets a trivial task jump straight from To-do to Done, skipping Waiting/Test', () => {
    const onMoveTask = vi.fn()
    const task = makeTask({ id: '1', title: 'Trivial task', status: 'todo' })
    render(<TaskBoard tasks={[task]} codesById={{}} onOpenTask={vi.fn()} onMoveTask={onMoveTask} />)

    fireEvent.click(screen.getByTestId('wk-board-card-move-done-1'))

    expect(onMoveTask).toHaveBeenCalledWith(task, 'done')
  })

  it('has no move-back control on the first column and no move-next/move-done on the last', () => {
    const tasks = [
      makeTask({ id: '1', title: 'Todo task', status: 'todo' }),
      makeTask({ id: '2', title: 'Done task', status: 'done' }),
    ]
    render(<TaskBoard tasks={tasks} codesById={{}} onOpenTask={vi.fn()} onMoveTask={vi.fn()} />)

    expect(screen.queryByTestId('wk-board-card-move-prev-1')).not.toBeInTheDocument()
    expect(screen.queryByTestId('wk-board-card-move-next-2')).not.toBeInTheDocument()
    expect(screen.queryByTestId('wk-board-card-move-done-2')).not.toBeInTheDocument()
  })

  it('exposes a drag handle on each card for pointer/keyboard drag-and-drop', () => {
    const task = makeTask({ id: '1', title: 'Todo task', status: 'todo' })
    render(<TaskBoard tasks={[task]} codesById={{}} onOpenTask={vi.fn()} onMoveTask={vi.fn()} />)

    const handle = screen.getByTestId('wk-board-card-drag-1')
    expect(handle).toHaveAttribute('aria-roledescription', 'draggable')
  })

  it('moves a task to another column via keyboard drag-and-drop', async () => {
    stubColumnRects()
    const onMoveTask = vi.fn()
    const task = makeTask({ id: '1', title: 'Todo task', status: 'todo' })
    render(<TaskBoard tasks={[task]} codesById={{}} onOpenTask={vi.fn()} onMoveTask={onMoveTask} />)

    const handle = screen.getByTestId('wk-board-card-drag-1')
    handle.focus()
    fireEvent.keyDown(handle, { code: 'Space' })
    await flushTimers()
    fireEvent.keyDown(handle, { code: 'ArrowRight' })
    fireEvent.keyDown(handle, { code: 'Space' })

    expect(onMoveTask).toHaveBeenCalledWith(task, 'in_progress')
  })

  it('highlights the column being dragged over as a drop target', async () => {
    stubColumnRects()
    const task = makeTask({ id: '1', title: 'Todo task', status: 'todo' })
    render(<TaskBoard tasks={[task]} codesById={{}} onOpenTask={vi.fn()} onMoveTask={vi.fn()} />)

    const handle = screen.getByTestId('wk-board-card-drag-1')
    handle.focus()
    fireEvent.keyDown(handle, { code: 'Space' })
    await flushTimers()
    fireEvent.keyDown(handle, { code: 'ArrowRight' })

    expect(screen.getByTestId('wk-board-column-in_progress')).toHaveClass('is-drop-target')

    fireEvent.keyDown(handle, { code: 'Escape' })
  })

  it('shows the linked code and priority on a card', () => {
    const task = makeTask({
      id: '1',
      title: 'Project task',
      priority: 'high',
      codeId: '9',
    })
    render(
      <TaskBoard
        tasks={[task]}
        codesById={{
          '9': {
            id: '9',
            number: 'N9/1042',
            name: 'Paper V4',
            label: 'MNT',
            color: '#5b9cf6',
            activities: [],
            isVirtual: false,
            realCodeId: null,
            realCodeNumber: null,
          },
        }}
        onOpenTask={vi.fn()}
        onMoveTask={vi.fn()}
      />,
    )

    expect(screen.getByText('Paper V4')).toBeInTheDocument()
    expect(screen.getByText('high')).toBeInTheDocument()
  })
})
