import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { TasksScreen } from './TasksScreen'
import type { Task, TimesheetCode } from '../types'

function makeCode(id: string, name: string, number = `N/${id}`): TimesheetCode {
  return {
    id,
    number,
    name,
    label: 'MNT',
    color: '#5b9cf6',
    activities: [],
    isVirtual: false,
    realCodeId: null,
    realCodeNumber: null,
  }
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

describe('TasksScreen', () => {
  it('shows an empty state when there are no tasks', () => {
    render(<TasksScreen tasks={[]} codesById={{}} onNew={vi.fn()} onOpenTask={vi.fn()} />)

    expect(screen.getByText(/clean ledger/i)).toBeInTheDocument()
  })

  it('calls onNew when "New task" is clicked', () => {
    const onNew = vi.fn()
    render(<TasksScreen tasks={[]} codesById={{}} onNew={onNew} onOpenTask={vi.fn()} />)

    fireEvent.click(screen.getByText('+ New task'))

    expect(onNew).toHaveBeenCalled()
  })

  it('calls onOpenTask when a row is clicked', () => {
    const onOpenTask = vi.fn()
    const task = makeTask({ id: '42', title: 'Fix bug' })
    render(<TasksScreen tasks={[task]} codesById={{}} onNew={vi.fn()} onOpenTask={onOpenTask} />)

    fireEvent.click(screen.getByTestId('wk-task-row-42'))

    expect(onOpenTask).toHaveBeenCalledWith(task)
  })

  it("calls onStartTask (not onOpenTask) when a row's Start action is clicked (BIZ-023)", () => {
    const onOpenTask = vi.fn()
    const onStartTask = vi.fn()
    const task = makeTask({ id: '42', title: 'Fix bug' })
    render(
      <TasksScreen
        tasks={[task]}
        codesById={{}}
        onNew={vi.fn()}
        onOpenTask={onOpenTask}
        onStartTask={onStartTask}
      />,
    )

    fireEvent.click(screen.getByTestId('wk-task-start-42'))

    expect(onStartTask).toHaveBeenCalledWith(task)
    expect(onOpenTask).not.toHaveBeenCalled()
  })

  it('does not render a Start action when onStartTask is omitted', () => {
    const task = makeTask({ id: '42', title: 'Fix bug' })
    render(<TasksScreen tasks={[task]} codesById={{}} onNew={vi.fn()} onOpenTask={vi.fn()} />)

    expect(screen.queryByTestId('wk-task-start-42')).not.toBeInTheDocument()
  })

  it('sorts by due date ascending by default, with orphan due dates last', () => {
    const tasks = [
      makeTask({ id: '1', title: 'Later', dueDate: '2026-08-01' }),
      makeTask({ id: '2', title: 'No due date', dueDate: null }),
      makeTask({ id: '3', title: 'Sooner', dueDate: '2026-07-10' }),
    ]
    render(<TasksScreen tasks={tasks} codesById={{}} onNew={vi.fn()} onOpenTask={vi.fn()} />)

    const rows = screen.getAllByRole('row').slice(1) // skip header row
    expect(within(rows[0]).getByText('Sooner')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Later')).toBeInTheDocument()
    expect(within(rows[2]).getByText('No due date')).toBeInTheDocument()
  })

  it('re-sorts by title when the sort select changes', () => {
    const tasks = [makeTask({ id: '1', title: 'Zebra' }), makeTask({ id: '2', title: 'Alpha' })]
    render(<TasksScreen tasks={tasks} codesById={{}} onNew={vi.fn()} onOpenTask={vi.fn()} />)

    fireEvent.change(screen.getByTestId('wk-task-sort-select'), { target: { value: 'title' } })

    const rows = screen.getAllByRole('row').slice(1)
    expect(within(rows[0]).getByText('Alpha')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Zebra')).toBeInTheDocument()
  })

  it('reverses sort direction when clicking the same column header twice', () => {
    const tasks = [makeTask({ id: '1', title: 'Alpha' }), makeTask({ id: '2', title: 'Zebra' })]
    render(<TasksScreen tasks={tasks} codesById={{}} onNew={vi.fn()} onOpenTask={vi.fn()} />)

    fireEvent.change(screen.getByTestId('wk-task-sort-select'), { target: { value: 'title' } })
    fireEvent.click(screen.getByTestId('wk-task-sort-title'))

    const rows = screen.getAllByRole('row').slice(1)
    expect(within(rows[0]).getByText('Zebra')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Alpha')).toBeInTheDocument()
  })

  it('groups tasks by status when requested', () => {
    const tasks = [
      makeTask({ id: '1', title: 'Todo task', status: 'todo' }),
      makeTask({ id: '2', title: 'Done task', status: 'done' }),
    ]
    render(<TasksScreen tasks={tasks} codesById={{}} onNew={vi.fn()} onOpenTask={vi.fn()} />)

    fireEvent.change(screen.getByTestId('wk-task-group-select'), { target: { value: 'status' } })

    expect(document.querySelectorAll('.wk-task-group-title')).toHaveLength(2)
    const titles = [...document.querySelectorAll('.wk-task-group-title')].map(
      (el) => el.textContent,
    )
    expect(titles).toEqual(['To-do', 'Done'])
  })

  it('groups tasks by priority, showing "No priority" for tasks without one', () => {
    const tasks = [
      makeTask({ id: '1', title: 'Urgent', priority: 'high' }),
      makeTask({ id: '2', title: 'Someday', priority: null }),
    ]
    render(<TasksScreen tasks={tasks} codesById={{}} onNew={vi.fn()} onOpenTask={vi.fn()} />)

    fireEvent.change(screen.getByTestId('wk-task-group-select'), { target: { value: 'priority' } })

    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText('No priority')).toBeInTheDocument()
  })

  it('groups the list by project (code), ordering by code name with "No project" last', () => {
    const codesById = { '9': makeCode('9', 'Paper V4'), '5': makeCode('5', 'Alpha') }
    const tasks = [
      makeTask({ id: '1', title: 'Paper task', codeId: '9' }),
      makeTask({ id: '2', title: 'Orphan task', codeId: null }),
      makeTask({ id: '3', title: 'Alpha task', codeId: '5' }),
    ]
    render(<TasksScreen tasks={tasks} codesById={codesById} onNew={vi.fn()} onOpenTask={vi.fn()} />)

    fireEvent.change(screen.getByTestId('wk-task-group-select'), { target: { value: 'code' } })

    const titles = [...document.querySelectorAll('.wk-task-group-title')].map(
      (el) => el.textContent,
    )
    expect(titles).toEqual(['Alpha', 'Paper V4', 'No project'])
  })

  it('splits the board into project swimlanes (plus "No project") when grouped by project', () => {
    const codesById = { '9': makeCode('9', 'Paper V4') }
    const tasks = [
      makeTask({ id: '1', title: 'Paper task', codeId: '9' }),
      makeTask({ id: '2', title: 'Orphan task', codeId: null }),
    ]
    render(<TasksScreen tasks={tasks} codesById={codesById} onNew={vi.fn()} onOpenTask={vi.fn()} />)

    fireEvent.click(screen.getByTestId('wk-task-view-board'))
    fireEvent.change(screen.getByTestId('wk-task-group-select'), { target: { value: 'code' } })

    expect(
      within(screen.getByTestId('wk-board-lane-9')).getByText('Paper task'),
    ).toBeInTheDocument()
    expect(
      within(screen.getByTestId('wk-board-lane-none')).getByText('Orphan task'),
    ).toBeInTheDocument()
  })

  it('adds a task from a list project section, prefilled with that section code (BIZ-067)', () => {
    const codesById = { '9': makeCode('9', 'Paper V4') }
    const tasks = [
      makeTask({ id: '1', title: 'Paper task', codeId: '9' }),
      makeTask({ id: '2', title: 'Orphan task', codeId: null }),
    ]
    const onNewInCode = vi.fn()
    render(
      <TasksScreen
        tasks={tasks}
        codesById={codesById}
        onNew={vi.fn()}
        onNewInCode={onNewInCode}
        onOpenTask={vi.fn()}
      />,
    )
    fireEvent.change(screen.getByTestId('wk-task-group-select'), { target: { value: 'code' } })

    fireEvent.click(screen.getByTestId('wk-task-group-add-9'))
    expect(onNewInCode).toHaveBeenCalledWith('9')
    fireEvent.click(screen.getByTestId('wk-task-group-add-none'))
    expect(onNewInCode).toHaveBeenCalledWith(null)
  })

  it('adds a task from a board project swimlane, prefilled with that lane code (BIZ-067)', () => {
    const codesById = { '9': makeCode('9', 'Paper V4') }
    const tasks = [
      makeTask({ id: '1', title: 'Paper task', codeId: '9' }),
      makeTask({ id: '2', title: 'Orphan task', codeId: null }),
    ]
    const onNewInCode = vi.fn()
    render(
      <TasksScreen
        tasks={tasks}
        codesById={codesById}
        onNew={vi.fn()}
        onNewInCode={onNewInCode}
        onOpenTask={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByTestId('wk-task-view-board'))
    fireEvent.change(screen.getByTestId('wk-task-group-select'), { target: { value: 'code' } })

    fireEvent.click(screen.getByTestId('wk-board-lane-add-9'))
    expect(onNewInCode).toHaveBeenCalledWith('9')
    fireEvent.click(screen.getByTestId('wk-board-lane-add-none'))
    expect(onNewInCode).toHaveBeenCalledWith(null)
  })

  it('hides the per-section Add unless grouping by project with onNewInCode (BIZ-067)', () => {
    const codesById = { '9': makeCode('9', 'Paper V4') }
    const tasks = [makeTask({ id: '1', title: 'Paper task', codeId: '9' })]

    // Grouped by project but no handler → no button.
    const { unmount } = render(
      <TasksScreen tasks={tasks} codesById={codesById} onNew={vi.fn()} onOpenTask={vi.fn()} />,
    )
    fireEvent.change(screen.getByTestId('wk-task-group-select'), { target: { value: 'code' } })
    expect(screen.queryByTestId('wk-task-group-add-9')).not.toBeInTheDocument()
    unmount()

    // Handler present but grouped by status → no project-section button.
    render(
      <TasksScreen
        tasks={tasks}
        codesById={codesById}
        onNew={vi.fn()}
        onNewInCode={vi.fn()}
        onOpenTask={vi.fn()}
      />,
    )
    fireEvent.change(screen.getByTestId('wk-task-group-select'), { target: { value: 'status' } })
    expect(screen.queryByTestId('wk-task-group-add-9')).not.toBeInTheDocument()
  })

  it('shows the list view by default, with a toggle to switch to the board', () => {
    const task = makeTask({ id: '1', title: 'Fix bug' })
    render(<TasksScreen tasks={[task]} codesById={{}} onNew={vi.fn()} onOpenTask={vi.fn()} />)

    expect(screen.getByTestId('wk-task-table')).toBeInTheDocument()
    expect(screen.queryByTestId('wk-board-column-todo')).not.toBeInTheDocument()
  })

  it('switches to the kanban board when the board toggle is clicked', () => {
    const task = makeTask({ id: '1', title: 'Fix bug' })
    render(<TasksScreen tasks={[task]} codesById={{}} onNew={vi.fn()} onOpenTask={vi.fn()} />)

    fireEvent.click(screen.getByTestId('wk-task-view-board'))

    expect(screen.getByTestId('wk-board-column-todo')).toBeInTheDocument()
    expect(screen.queryByTestId('wk-task-table')).not.toBeInTheDocument()
  })

  it('switches back to the list from the board', () => {
    const task = makeTask({ id: '1', title: 'Fix bug' })
    render(<TasksScreen tasks={[task]} codesById={{}} onNew={vi.fn()} onOpenTask={vi.fn()} />)

    fireEvent.click(screen.getByTestId('wk-task-view-board'))
    fireEvent.click(screen.getByTestId('wk-task-view-list'))

    expect(screen.getByTestId('wk-task-table')).toBeInTheDocument()
    expect(screen.queryByTestId('wk-board-column-todo')).not.toBeInTheDocument()
  })

  it('moving a task on the board calls onMoveTask with the new status', () => {
    const onMoveTask = vi.fn()
    const task = makeTask({ id: '1', title: 'Todo task', status: 'todo' })
    render(
      <TasksScreen
        tasks={[task]}
        codesById={{}}
        onNew={vi.fn()}
        onOpenTask={vi.fn()}
        onMoveTask={onMoveTask}
      />,
    )

    fireEvent.click(screen.getByTestId('wk-task-view-board'))
    fireEvent.click(screen.getByTestId('wk-board-card-move-next-1'))

    expect(onMoveTask).toHaveBeenCalledWith(task, 'in_progress')
  })

  it('shows priority and due as inline pills only when set (BIZ-041)', () => {
    const tasks = [
      makeTask({ id: '1', title: 'Urgent', priority: 'high', dueDate: '2026-08-01' }),
      makeTask({ id: '2', title: 'Someday' }),
    ]
    render(<TasksScreen tasks={tasks} codesById={{}} onNew={vi.fn()} onOpenTask={vi.fn()} />)

    expect(screen.getByText('high')).toBeInTheDocument()
    // The due pill carries the exact date as a tooltip regardless of "today" (BIZ-062).
    expect(screen.getByTitle('2026-08-01')).toBeInTheDocument()
    // Only the task with a priority shows a pill — no empty priority filler on the other row.
    expect(screen.getAllByText('high')).toHaveLength(1)
    expect(document.querySelectorAll('.wk-task-priority')).toHaveLength(1)
  })

  it('renders the due date as a relative label with the exact date on hover (BIZ-062)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-10T09:00:00Z'))
    try {
      const tasks = [
        makeTask({ id: '1', title: 'Due tomorrow', dueDate: '2026-07-11' }),
        makeTask({ id: '2', title: 'Was due', dueDate: '2026-07-08', status: 'todo' }),
      ]
      render(<TasksScreen tasks={tasks} codesById={{}} onNew={vi.fn()} onOpenTask={vi.fn()} />)

      const soon = screen.getByTitle('2026-07-11')
      expect(soon).toHaveTextContent('Tomorrow')
      expect(soon).not.toHaveClass('is-overdue')

      const late = screen.getByTitle('2026-07-08')
      expect(late).toHaveTextContent('2d overdue')
      expect(late).toHaveClass('is-overdue')
    } finally {
      vi.useRealTimers()
    }
  })

  it('never flags a terminal-state task as overdue, even past its due date (BIZ-062)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-10T09:00:00Z'))
    try {
      const done = makeTask({ id: '9', title: 'Shipped', dueDate: '2026-07-01', status: 'done' })
      render(<TasksScreen tasks={[done]} codesById={{}} onNew={vi.fn()} onOpenTask={vi.fn()} />)
      expect(screen.getByTitle('2026-07-01')).not.toHaveClass('is-overdue')
    } finally {
      vi.useRealTimers()
    }
  })

  it('Focus filter narrows the list to overdue, due-today, and high-priority tasks', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-10T09:00:00Z'))
    try {
      const tasks = [
        makeTask({ id: '1', title: 'Overdue', dueDate: '2026-07-08', status: 'todo' }),
        makeTask({ id: '2', title: 'Due today', dueDate: '2026-07-10', status: 'todo' }),
        makeTask({ id: '3', title: 'Important', priority: 'high' }),
        makeTask({ id: '4', title: 'Someday', dueDate: '2026-08-01', priority: 'low' }),
        makeTask({ id: '5', title: 'Shipped', dueDate: '2026-07-01', status: 'done' }),
      ]
      render(<TasksScreen tasks={tasks} codesById={{}} onNew={vi.fn()} onOpenTask={vi.fn()} />)

      // The button advertises how many tasks need attention (overdue + today + high priority).
      const focus = screen.getByTestId('wk-task-focus')
      expect(focus.querySelector('.wk-task-focus-count')).toHaveTextContent('3')

      // Off: every task is listed, including the far-off and the shipped one.
      expect(screen.getByText('Someday')).toBeInTheDocument()
      expect(screen.getByText('Shipped')).toBeInTheDocument()

      fireEvent.click(focus)

      // On: only the three that need attention survive — the far-off and terminal ones drop out.
      expect(screen.getByText('Overdue')).toBeInTheDocument()
      expect(screen.getByText('Due today')).toBeInTheDocument()
      expect(screen.getByText('Important')).toBeInTheDocument()
      expect(screen.queryByText('Someday')).not.toBeInTheDocument()
      expect(screen.queryByText('Shipped')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('the Focus filter also narrows the board, and is disabled when nothing needs attention', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-10T09:00:00Z'))
    try {
      const calm = [
        makeTask({ id: '1', title: 'Later', dueDate: '2026-09-01', priority: 'low' }),
        makeTask({ id: '2', title: 'Shipped', dueDate: '2026-07-01', status: 'done' }),
      ]
      const { unmount } = render(
        <TasksScreen tasks={calm} codesById={{}} onNew={vi.fn()} onOpenTask={vi.fn()} />,
      )
      // Nothing overdue/today/high → the button reports 0 and cannot be engaged.
      const idle = screen.getByTestId('wk-task-focus')
      expect(idle.querySelector('.wk-task-focus-count')).toHaveTextContent('0')
      expect(idle).toBeDisabled()
      unmount()

      const tasks = [
        makeTask({ id: '3', title: 'Overdue', dueDate: '2026-07-08', status: 'todo' }),
        makeTask({ id: '4', title: 'Someday', dueDate: '2026-09-01', priority: 'low' }),
      ]
      render(<TasksScreen tasks={tasks} codesById={{}} onNew={vi.fn()} onOpenTask={vi.fn()} />)
      fireEvent.click(screen.getByTestId('wk-task-view-board'))
      fireEvent.click(screen.getByTestId('wk-task-focus'))

      expect(screen.getByText('Overdue')).toBeInTheDocument()
      expect(screen.queryByText('Someday')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('changes a task status inline without opening the panel (BIZ-043)', () => {
    const onMoveTask = vi.fn()
    const onOpenTask = vi.fn()
    const task = makeTask({ id: '5', title: 'Triage me', status: 'todo' })
    render(
      <TasksScreen
        tasks={[task]}
        codesById={{}}
        onNew={vi.fn()}
        onOpenTask={onOpenTask}
        onMoveTask={onMoveTask}
      />,
    )

    fireEvent.change(screen.getByTestId('wk-task-status-select-5'), {
      target: { value: 'in_progress' },
    })

    expect(onMoveTask).toHaveBeenCalledWith(task, 'in_progress')
    expect(onOpenTask).not.toHaveBeenCalled()
  })

  it('shows the linked code name and tags on a row', () => {
    const task = makeTask({
      id: '1',
      title: 'Project task',
      codeId: '9',
      tags: ['urgent', 'backend'],
    })
    render(
      <TasksScreen
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
        onNew={vi.fn()}
        onOpenTask={vi.fn()}
      />,
    )

    expect(screen.getByText('Paper V4')).toBeInTheDocument()
    expect(screen.getByText('urgent')).toBeInTheDocument()
    expect(screen.getByText('backend')).toBeInTheDocument()
  })

  it('is controlled by view preferences and reports changes (BIZ-053)', () => {
    const onPreferencesChange = vi.fn()
    const preferences = {
      task_view: 'list' as const,
      task_group: 'none' as const,
      task_sort: 'due' as const,
      task_sort_dir: 'asc' as const,
      period_mode: 'review' as const,
      done_collapsed: false,
      enter_rounding: false,
    }
    const tasks = [makeTask({ id: '1', title: 'A' })]
    render(
      <TasksScreen
        tasks={tasks}
        codesById={{}}
        onNew={vi.fn()}
        onOpenTask={vi.fn()}
        preferences={preferences}
        onPreferencesChange={onPreferencesChange}
      />,
    )

    fireEvent.change(screen.getByTestId('wk-task-group-select'), { target: { value: 'status' } })
    expect(onPreferencesChange).toHaveBeenCalledWith({ task_group: 'status' })

    fireEvent.change(screen.getByTestId('wk-task-sort-select'), { target: { value: 'title' } })
    expect(onPreferencesChange).toHaveBeenCalledWith({ task_sort: 'title' })
  })

  it('starts a timer from a board card (BIZ-050)', () => {
    const onStartTask = vi.fn()
    const task = makeTask({ id: '1', title: 'Board task', status: 'todo' })
    render(
      <TasksScreen
        tasks={[task]}
        codesById={{}}
        onNew={vi.fn()}
        onOpenTask={vi.fn()}
        onStartTask={onStartTask}
      />,
    )

    fireEvent.click(screen.getByTestId('wk-task-view-board'))
    fireEvent.click(screen.getByTestId('wk-board-card-start-1'))

    expect(onStartTask).toHaveBeenCalledWith(task)
  })

  it('renders a single table with section rows when grouped, not one table per group (BIZ-051)', () => {
    const tasks = [
      makeTask({ id: '1', title: 'Todo task', status: 'todo' }),
      makeTask({ id: '2', title: 'Done task', status: 'done' }),
    ]
    render(<TasksScreen tasks={tasks} codesById={{}} onNew={vi.fn()} onOpenTask={vi.fn()} />)

    fireEvent.change(screen.getByTestId('wk-task-group-select'), { target: { value: 'status' } })

    expect(screen.getAllByTestId('wk-task-table')).toHaveLength(1)
    expect(document.querySelectorAll('.wk-task-group-row')).toHaveLength(2)
  })

  it('drops the Code column when grouped by project (code), keeps it otherwise (BIZ-051)', () => {
    const codesById = { '9': makeCode('9', 'Paper V4') }
    const tasks = [makeTask({ id: '1', title: 'Paper task', codeId: '9' })]
    render(<TasksScreen tasks={tasks} codesById={codesById} onNew={vi.fn()} onOpenTask={vi.fn()} />)

    expect(screen.getByRole('columnheader', { name: 'Code' })).toBeInTheDocument()

    fireEvent.change(screen.getByTestId('wk-task-group-select'), { target: { value: 'code' } })

    expect(screen.queryByRole('columnheader', { name: 'Code' })).not.toBeInTheDocument()
  })

  // BIZ-057 — dynamic states from the user's list.
  const CUSTOM = [
    { id: 'x', label: 'Icebox' },
    { id: 'y', label: 'Active' },
    { id: 'z', label: 'Shipped' },
  ]

  it('renders the inline status dropdown from the custom state list', () => {
    const tasks = [makeTask({ id: '1', status: 'y' })]
    render(
      <TasksScreen
        tasks={tasks}
        codesById={{}}
        taskStates={CUSTOM}
        onNew={vi.fn()}
        onOpenTask={vi.fn()}
        onMoveTask={vi.fn()}
      />,
    )
    const select = screen.getByTestId('wk-task-status-select-1') as HTMLSelectElement
    expect(Array.from(select.options).map((o) => o.textContent)).toEqual([
      'Icebox',
      'Active',
      'Shipped',
    ])
    expect(select.value).toBe('y')
  })

  it('orders status groups by the custom state order, not first appearance', () => {
    const tasks = [
      makeTask({ id: '1', title: 'Shipped one', status: 'z' }),
      makeTask({ id: '2', title: 'Icebox one', status: 'x' }),
    ]
    render(
      <TasksScreen
        tasks={tasks}
        codesById={{}}
        taskStates={CUSTOM}
        onNew={vi.fn()}
        onOpenTask={vi.fn()}
      />,
    )
    fireEvent.change(screen.getByTestId('wk-task-group-select'), { target: { value: 'status' } })
    const headers = Array.from(document.querySelectorAll('.wk-task-group-title')).map(
      (n) => n.textContent,
    )
    // Icebox (x) precedes Shipped (z) despite Shipped's task appearing first in the input.
    expect(headers).toEqual(['Icebox', 'Shipped'])
  })
})
