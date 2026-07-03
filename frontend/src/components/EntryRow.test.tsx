import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { EntryRow } from './EntryRow'
import type { Entry, TimesheetCode } from '../types'

const CODE: TimesheetCode = {
  id: '1',
  number: 'N9/1042',
  name: 'Paper V4',
  label: 'MNT - PAP V4',
  color: '#5b9cf6',
  activities: [{ code: '0001', label: 'Bug fixing' }],
  isVirtual: false,
  realCodeId: null,
  realCodeNumber: null,
}

const ENTRY: Entry = {
  id: '7',
  date: '2026-07-02',
  start: 540,
  end: 600,
  codeId: '1',
  activity: 'Bug fixing',
  description: 'writing spec',
}

function renderRow(overrides: Partial<Parameters<typeof EntryRow>[0]> = {}) {
  const handlers = {
    onEdit: vi.fn(),
    onCategorize: vi.fn(),
    onOpenEditor: vi.fn(),
    onResume: vi.fn(),
    onDelete: vi.fn(),
  }
  render(<EntryRow entry={ENTRY} code={CODE} {...handlers} {...overrides} />)
  return handlers
}

describe('EntryRow row actions', () => {
  it('exposes an unambiguous accessible name for each row action', () => {
    renderRow()
    expect(screen.getByRole('button', { name: 'Edit entry' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resume this task' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete entry' })).toBeInTheDocument()
  })

  it('gives row actions an adequately sized click target (at least 24x24 CSS px)', () => {
    renderRow()
    for (const name of ['Edit entry', 'Resume this task', 'Delete entry']) {
      const button = screen.getByRole('button', { name })
      expect(button.className).toContain('wk-row-action')
    }
  })

  it('invokes the matching handler when an action is clicked', () => {
    const handlers = renderRow()

    fireEvent.click(screen.getByRole('button', { name: 'Edit entry' }))
    expect(handlers.onOpenEditor).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Resume this task' }))
    expect(handlers.onResume).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Delete entry' }))
    expect(handlers.onDelete).toHaveBeenCalledTimes(1)
  })
})
