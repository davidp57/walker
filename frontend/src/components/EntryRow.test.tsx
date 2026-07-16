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

describe('EntryRow — overlap note (BIZ-052)', () => {
  it('shows an overlap badge and a trim button for a fixable overlap, wiring the trim to onEdit', () => {
    const handlers = renderRow({
      overlap: { partners: [{ id: 'b', start: 600, end: 720 }], fixEnd: 600 },
    })

    expect(screen.getByText(/overlaps 10:00–12:00/i)).toBeInTheDocument()
    const trim = screen.getByRole('button', { name: /trim to 10:00/i })
    fireEvent.click(trim)
    expect(handlers.onEdit).toHaveBeenCalledWith({ end: 600 })
  })

  it('shows the overlap badge but no trim button for a nested/same-start overlap', () => {
    renderRow({ overlap: { partners: [{ id: 'b', start: 600, end: 720 }], fixEnd: null } })

    expect(screen.getByText(/overlaps/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /trim to/i })).toBeNull()
  })

  it('names the running timer as the partner when overlapping the live entry (BIZ-072)', () => {
    const handlers = renderRow({
      overlap: { partners: [{ id: 'run', start: 600, end: null }], fixEnd: 600 },
    })

    expect(screen.getByText(/overlaps running timer \(since 10:00\)/i)).toBeInTheDocument()
    const trim = screen.getByRole('button', { name: /trim to 10:00/i })
    fireEvent.click(trim)
    expect(handlers.onEdit).toHaveBeenCalledWith({ end: 600 })
  })

  it('renders no overlap note when the entry overlaps nothing', () => {
    renderRow()
    expect(screen.queryByText(/overlaps/i)).toBeNull()
  })
})

describe('EntryRow — coded but no activity (BIZ-070)', () => {
  it('flags an entry that has a code but no activity (won’t reach the matrix)', () => {
    renderRow({ entry: { ...ENTRY, activity: null } })
    expect(screen.getByText(/pick an activity/i)).toBeInTheDocument()
  })

  it('does not flag a fully-categorized entry', () => {
    renderRow()
    expect(screen.queryByText(/pick an activity/i)).toBeNull()
  })
})

describe('EntryRow row actions', () => {
  it('exposes an unambiguous accessible name for each row action', () => {
    renderRow()
    expect(screen.getByRole('button', { name: 'Edit entry' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resume this entry' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete entry' })).toBeInTheDocument()
  })

  it('gives row actions an adequately sized click target (at least 24x24 CSS px)', () => {
    renderRow()
    for (const name of ['Edit entry', 'Resume this entry', 'Delete entry']) {
      const button = screen.getByRole('button', { name })
      expect(button.className).toContain('wk-row-action')
    }
  })

  it('invokes the matching handler when an action is clicked', () => {
    const handlers = renderRow()

    fireEvent.click(screen.getByRole('button', { name: 'Edit entry' }))
    expect(handlers.onOpenEditor).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Resume this entry' }))
    expect(handlers.onResume).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Delete entry' }))
    expect(handlers.onDelete).toHaveBeenCalledTimes(1)
  })
})

const code = (overrides: Partial<TimesheetCode> = {}): TimesheetCode => ({
  id: 'c1',
  number: 'N9/1042',
  name: 'Internal administration',
  label: 'MNT - INT ADMIN',
  color: '#ff0000',
  activities: [],
  isVirtual: false,
  realCodeId: null,
  realCodeNumber: null,
  ...overrides,
})

const entry = (overrides: Partial<Entry> = {}): Entry => ({
  id: 'e1',
  date: '2026-07-03',
  start: 540,
  end: 600,
  codeId: 'c1',
  activity: 'Internal administration',
  description: '',
  ...overrides,
})

const noop = () => {}

describe('EntryRow — Activity dedup', () => {
  it('omits the Activity from the meta line when it equals the Code project name', () => {
    render(
      <EntryRow
        entry={entry()}
        code={code({ name: 'Internal administration' })}
        onEdit={noop}
        onCategorize={noop}
        onOpenEditor={noop}
        onResume={noop}
        onDelete={noop}
      />,
    )

    // Project name renders once (in the name row); the meta line must not repeat it.
    expect(screen.getAllByText('Internal administration')).toHaveLength(1)
    expect(document.querySelector('.wk-code-meta')?.textContent).toBe('N9/1042')
  })

  it('still shows the Activity in the meta line when it differs from the project name', () => {
    render(
      <EntryRow
        entry={entry({ activity: 'Bug fixing' })}
        code={code({ name: 'Paper V4' })}
        onEdit={noop}
        onCategorize={noop}
        onOpenEditor={noop}
        onResume={noop}
        onDelete={noop}
      />,
    )

    expect(screen.getByText('Paper V4')).toBeInTheDocument()
    expect(document.querySelector('.wk-code-meta')?.textContent).toBe('N9/1042 · Bug fixing')
  })
})

describe('EntryRow — manual marker (BIZ-065)', () => {
  const render1 = (overrides: Partial<Entry>) =>
    render(
      <EntryRow
        entry={entry(overrides)}
        code={code({ name: 'Paper V4' })}
        onEdit={noop}
        onCategorize={noop}
        onOpenEditor={noop}
        onResume={noop}
        onDelete={noop}
      />,
    )

  it('marks a manually-added entry', () => {
    render1({ source: 'manual' })
    expect(document.querySelector('.wk-manual-mark')).toBeInTheDocument()
  })

  it('does not mark timer or legacy entries', () => {
    const { unmount } = render1({ source: 'timer' })
    expect(document.querySelector('.wk-manual-mark')).toBeNull()
    unmount()
    render1({ source: null })
    expect(document.querySelector('.wk-manual-mark')).toBeNull()
  })
})

describe('EntryRow — running mode (BIZ-038)', () => {
  it('renders live, read-only: shows "now" + live duration and no edit/resume/delete', () => {
    renderRow({ running: true, liveMinutes: 48, entry: { ...ENTRY, end: null } })
    expect(screen.getByText('now')).toBeInTheDocument()
    expect(screen.getByText('0:48')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit entry' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete entry' })).not.toBeInTheDocument()
    expect(document.querySelector('.wk-entry-row.is-running')).toBeInTheDocument()
  })
})

describe('EntryRow — editing the running entry (BIZ-054)', () => {
  it('lets you categorize the running entry (code cell is clickable)', () => {
    const handlers = renderRow({ running: true, liveMinutes: 10, entry: { ...ENTRY, end: null } })
    fireEvent.click(screen.getByText('Paper V4'))
    expect(handlers.onCategorize).toHaveBeenCalled()
  })

  it('lets you edit the running entry description', () => {
    const handlers = renderRow({ running: true, liveMinutes: 10, entry: { ...ENTRY, end: null } })
    fireEvent.click(screen.getByText('writing spec'))
    const input = screen.getByDisplayValue('writing spec')
    fireEvent.change(input, { target: { value: 'updated note' } })
    fireEvent.blur(input)
    expect(handlers.onEdit).toHaveBeenCalledWith({ description: 'updated note' })
  })

  it('edits the running entry start without introducing an end (would stop the timer)', () => {
    const handlers = renderRow({ running: true, liveMinutes: 10, entry: { ...ENTRY, end: null } })
    fireEvent.click(screen.getByText('09:00'))
    const input = screen.getByDisplayValue('09:00')
    fireEvent.change(input, { target: { value: '10:00' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(handlers.onEdit).toHaveBeenCalledWith({ start: 600 })
  })
})

describe('EntryRow — empty description invite (BIZ-040)', () => {
  it('hides the "Add a description…" invite at rest and reveals it on row hover', () => {
    renderRow({ entry: { ...ENTRY, description: '' } })
    expect(screen.queryByText('Add a description…')).not.toBeInTheDocument()

    const row = document.querySelector('.wk-entry-row') as HTMLElement
    fireEvent.mouseEnter(row)
    expect(screen.getByText('Add a description…')).toBeInTheDocument()
  })
})

describe('EntryRow — duration bar (BIZ-042)', () => {
  it('renders a proportional duration bar when a group scale is given', () => {
    // duration = 600-540 = 60; maxMinutes 120 → 50%.
    renderRow({ maxMinutes: 120 })
    const fill = document.querySelector('.wk-dur-bar-fill') as HTMLElement
    expect(fill).toBeInTheDocument()
    expect(fill.style.width).toBe('50%')
  })

  it('renders no bar when no scale is provided', () => {
    renderRow()
    expect(document.querySelector('.wk-dur-bar')).not.toBeInTheDocument()
  })
})
