import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TaskPanel } from './TaskPanel'
import type { Task, TimesheetCode } from '../types'

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: '1',
    title: 'Existing task',
    description: 'Some notes',
    status: 'todo',
    priority: null,
    dueDate: null,
    tags: ['backend'],
    codeId: null,
    recurrenceRule: null,
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
    ...overrides,
  }
}

const CODE: TimesheetCode = {
  id: '9',
  number: 'N9/1042',
  name: 'Paper V4',
  label: 'MNT',
  color: '#5b9cf6',
  activities: [],
  isVirtual: false,
  realCodeId: null,
  realCodeNumber: null,
}

describe('TaskPanel', () => {
  it('creates a new task with just a title', () => {
    const onSave = vi.fn()
    render(
      <TaskPanel task={null} codes={[]} tagSuggestions={[]} onSave={onSave} onClose={vi.fn()} />,
    )

    fireEvent.change(screen.getByTestId('wk-task-title-input'), {
      target: { value: 'Renew passport' },
    })
    fireEvent.click(screen.getByTestId('wk-task-save'))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Renew passport', status: 'todo', tags: [], codeId: null }),
    )
  })

  it('prefills the code for a new task from initialCodeId (BIZ-067)', () => {
    const onSave = vi.fn()
    render(
      <TaskPanel
        task={null}
        initialCodeId={CODE.id}
        codes={[CODE]}
        tagSuggestions={[]}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByTestId('wk-task-code-trigger')).toHaveTextContent('Paper V4')
    fireEvent.change(screen.getByTestId('wk-task-title-input'), {
      target: { value: 'New paper task' },
    })
    fireEvent.click(screen.getByTestId('wk-task-save'))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ codeId: '9' }))
  })

  it('disables Save while the title is blank', () => {
    render(
      <TaskPanel task={null} codes={[]} tagSuggestions={[]} onSave={vi.fn()} onClose={vi.fn()} />,
    )

    expect(screen.getByTestId('wk-task-save')).toBeDisabled()
  })

  it('prefills fields when editing an existing task', async () => {
    const task = makeTask({ title: 'Fix bug', description: 'Notes here' })
    render(
      <TaskPanel task={task} codes={[]} tagSuggestions={[]} onSave={vi.fn()} onClose={vi.fn()} />,
    )

    expect(screen.getByTestId('wk-task-title-input')).toHaveValue('Fix bug')
    expect(await screen.findByText('Notes here')).toBeInTheDocument()
    expect(screen.getByText('backend')).toBeInTheDocument()
  })

  it('adds a tag on Enter and removes it via its chip button', () => {
    const onSave = vi.fn()
    render(
      <TaskPanel task={null} codes={[]} tagSuggestions={[]} onSave={onSave} onClose={vi.fn()} />,
    )

    fireEvent.change(screen.getByTestId('wk-task-title-input'), { target: { value: 'Task' } })
    const tagInput = screen.getByTestId('wk-task-tag-input')
    fireEvent.change(tagInput, { target: { value: 'urgent' } })
    fireEvent.keyDown(tagInput, { key: 'Enter' })

    expect(screen.getByText('urgent')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Remove tag urgent'))
    fireEvent.click(screen.getByTestId('wk-task-save'))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ tags: [] }))
  })

  it('offers autocomplete suggestions from previously used tags', () => {
    render(
      <TaskPanel
        task={null}
        codes={[]}
        tagSuggestions={['urgent', 'backend', 'frontend']}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByTestId('wk-task-tag-input'), { target: { value: 'back' } })

    expect(screen.getByTestId('wk-task-tag-suggestion-backend')).toBeInTheDocument()
  })

  it('picks a code via the searchable picker', () => {
    const onSave = vi.fn()
    render(
      <TaskPanel
        task={null}
        codes={[CODE]}
        tagSuggestions={[]}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByTestId('wk-task-title-input'), { target: { value: 'Task' } })
    fireEvent.click(screen.getByTestId('wk-task-code-trigger'))
    fireEvent.click(screen.getByText('Paper V4')) // code-only pick, no activity step
    fireEvent.click(screen.getByTestId('wk-task-save'))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ codeId: '9' }))
  })

  it('can clear the code back to an orphan task', () => {
    const onSave = vi.fn()
    render(
      <TaskPanel
        task={makeTask({ codeId: '9' })}
        codes={[CODE]}
        tagSuggestions={[]}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByTestId('wk-task-code-clear'))
    fireEvent.click(screen.getByTestId('wk-task-save'))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ codeId: null }))
  })

  it('offers creating a real or virtual code from the task code picker', () => {
    const onCreateNew = vi.fn()
    const onCreateNewVirtual = vi.fn()
    render(
      <TaskPanel
        task={null}
        codes={[]}
        tagSuggestions={[]}
        onSave={vi.fn()}
        onClose={vi.fn()}
        onCreateNew={onCreateNew}
        onCreateNewVirtual={onCreateNewVirtual}
      />,
    )

    fireEvent.click(screen.getByTestId('wk-task-code-trigger'))
    fireEvent.change(screen.getByPlaceholderText('Search code or activity…'), {
      target: { value: 'New thing' },
    })

    fireEvent.click(screen.getByText('➕ Create a new code'))
    expect(onCreateNew).toHaveBeenCalledWith('New thing')
  })

  it('deletes only after an inline confirm (Delete → Delete), then closes', () => {
    const onDelete = vi.fn()
    const onClose = vi.fn()
    const task = makeTask()
    render(
      <TaskPanel
        task={task}
        codes={[]}
        tagSuggestions={[]}
        onSave={vi.fn()}
        onDelete={onDelete}
        onClose={onClose}
      />,
    )

    // First click arms the confirm — nothing is deleted yet.
    fireEvent.click(screen.getByTestId('wk-task-delete'))
    expect(onDelete).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByText('Delete this task?')).toBeInTheDocument()

    // Confirming commits the deletion and closes the panel.
    fireEvent.click(screen.getByTestId('wk-task-delete-confirm'))
    expect(onDelete).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('cancels the delete via Keep, leaving the task intact', () => {
    const onDelete = vi.fn()
    const onClose = vi.fn()
    render(
      <TaskPanel
        task={makeTask()}
        codes={[]}
        tagSuggestions={[]}
        onSave={vi.fn()}
        onDelete={onDelete}
        onClose={onClose}
      />,
    )

    fireEvent.click(screen.getByTestId('wk-task-delete'))
    fireEvent.click(screen.getByTestId('wk-task-delete-cancel'))

    expect(onDelete).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    // Back to the armed-less state: the plain Delete button is shown again.
    expect(screen.getByTestId('wk-task-delete')).toBeInTheDocument()
    expect(screen.queryByText('Delete this task?')).not.toBeInTheDocument()
  })

  it('hides the Delete action when onDelete is omitted (creating)', () => {
    render(
      <TaskPanel task={null} codes={[]} tagSuggestions={[]} onSave={vi.fn()} onClose={vi.fn()} />,
    )

    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
  })

  it('calls onClose when Cancel is clicked without saving', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    render(
      <TaskPanel task={null} codes={[]} tagSuggestions={[]} onSave={onSave} onClose={onClose} />,
    )

    fireEvent.click(screen.getByText('Cancel'))

    expect(onSave).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('does not close on an outside (backdrop) click — only Cancel/Save/✕ do (BIZ-059)', () => {
    const onClose = vi.fn()
    render(
      <TaskPanel task={null} codes={[]} tagSuggestions={[]} onSave={vi.fn()} onClose={onClose} />,
    )

    fireEvent.click(document.querySelector('.wk-panel-overlay') as HTMLElement)

    expect(onClose).not.toHaveBeenCalled()
  })

  it('defaults to no recurrence rule', () => {
    const onSave = vi.fn()
    render(
      <TaskPanel task={null} codes={[]} tagSuggestions={[]} onSave={onSave} onClose={vi.fn()} />,
    )

    fireEvent.change(screen.getByTestId('wk-task-title-input'), { target: { value: 'Task' } })
    fireEvent.click(screen.getByTestId('wk-task-save'))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ recurrenceRule: null }))
  })

  it('sets an every-N-days recurrence rule', () => {
    const onSave = vi.fn()
    render(
      <TaskPanel task={null} codes={[]} tagSuggestions={[]} onSave={onSave} onClose={vi.fn()} />,
    )

    fireEvent.change(screen.getByTestId('wk-task-title-input'), { target: { value: 'Task' } })
    fireEvent.change(screen.getByTestId('wk-task-recurrence-kind-select'), {
      target: { value: 'every_n_days' },
    })
    fireEvent.change(screen.getByTestId('wk-task-recurrence-every-n-days-input'), {
      target: { value: '5' },
    })
    fireEvent.click(screen.getByTestId('wk-task-save'))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ recurrenceRule: { kind: 'every_n_days', n: 5 } }),
    )
  })

  it('sets a weekly recurrence rule on chosen weekdays', () => {
    const onSave = vi.fn()
    render(
      <TaskPanel task={null} codes={[]} tagSuggestions={[]} onSave={onSave} onClose={vi.fn()} />,
    )

    fireEvent.change(screen.getByTestId('wk-task-title-input'), { target: { value: 'Task' } })
    fireEvent.change(screen.getByTestId('wk-task-recurrence-kind-select'), {
      target: { value: 'weekly' },
    })
    fireEvent.click(screen.getByTestId('wk-task-recurrence-weekday-2')) // add Wed
    fireEvent.click(screen.getByTestId('wk-task-recurrence-weekday-4')) // add Fri
    fireEvent.click(screen.getByTestId('wk-task-save'))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ recurrenceRule: { kind: 'weekly', weekdays: [0, 2, 4] } }),
    )
  })

  it('sets a monthly recurrence rule on a day of month', () => {
    const onSave = vi.fn()
    render(
      <TaskPanel task={null} codes={[]} tagSuggestions={[]} onSave={onSave} onClose={vi.fn()} />,
    )

    fireEvent.change(screen.getByTestId('wk-task-title-input'), { target: { value: 'Task' } })
    fireEvent.change(screen.getByTestId('wk-task-recurrence-kind-select'), {
      target: { value: 'monthly' },
    })
    fireEvent.change(screen.getByTestId('wk-task-recurrence-monthly-day-input'), {
      target: { value: '15' },
    })
    fireEvent.click(screen.getByTestId('wk-task-save'))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ recurrenceRule: { kind: 'monthly', day: 15 } }),
    )
  })

  it('sets a period-relative recurrence rule with anchor and offset', () => {
    const onSave = vi.fn()
    render(
      <TaskPanel task={null} codes={[]} tagSuggestions={[]} onSave={onSave} onClose={vi.fn()} />,
    )

    fireEvent.change(screen.getByTestId('wk-task-title-input'), { target: { value: 'Task' } })
    fireEvent.change(screen.getByTestId('wk-task-recurrence-kind-select'), {
      target: { value: 'period_relative' },
    })
    fireEvent.change(screen.getByTestId('wk-task-recurrence-anchor-select'), {
      target: { value: 'end' },
    })
    fireEvent.change(screen.getByTestId('wk-task-recurrence-offset-input'), {
      target: { value: '-1' },
    })
    fireEvent.click(screen.getByTestId('wk-task-save'))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        recurrenceRule: { kind: 'period_relative', anchor: 'end', offsetDays: -1 },
      }),
    )
  })

  it('prefills the recurrence rule when editing an existing recurring task', () => {
    const task = makeTask({
      recurrenceRule: { kind: 'every_n_days', n: 7 },
    })
    render(
      <TaskPanel task={task} codes={[]} tagSuggestions={[]} onSave={vi.fn()} onClose={vi.fn()} />,
    )

    expect(screen.getByTestId('wk-task-recurrence-kind-select')).toHaveValue('every_n_days')
    expect(screen.getByTestId('wk-task-recurrence-every-n-days-input')).toHaveValue(7)
  })

  it('clears the recurrence rule when switching back to "does not repeat"', () => {
    const onSave = vi.fn()
    const task = makeTask({
      recurrenceRule: { kind: 'every_n_days', n: 7 },
    })
    render(
      <TaskPanel task={task} codes={[]} tagSuggestions={[]} onSave={onSave} onClose={vi.fn()} />,
    )

    fireEvent.change(screen.getByTestId('wk-task-recurrence-kind-select'), {
      target: { value: '' },
    })
    fireEvent.click(screen.getByTestId('wk-task-save'))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ recurrenceRule: null }))
  })
})
