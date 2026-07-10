import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TrackerScreen, type DayGroup } from './TrackerScreen'
import type { Entry, TimesheetCode } from '../types'

afterEach(() => cleanup())

const code: TimesheetCode = {
  id: '1',
  number: 'N9/1042',
  label: 'MNT',
  name: 'Paper V4',
  color: '#5b9cf6',
  activities: [],
  isVirtual: false,
  realCodeId: null,
  realCodeNumber: null,
}

const entry = (date: string): Entry => ({
  id: `e-${date}`,
  date,
  start: 540,
  end: 600,
  codeId: '1',
  activity: null,
  description: '',
})

const group = (date: string, label: string, entries: Entry[] = []): DayGroup => ({
  date,
  label,
  totalLabel: '1:00',
  entries,
})

function renderScreen(overrides: Partial<Parameters<typeof TrackerScreen>[0]> = {}) {
  const props = {
    groups: [] as DayGroup[],
    codesById: { '1': code },
    today: '2026-07-10',
    onEditEntry: vi.fn(),
    onCategorizeEntry: vi.fn(),
    onOpenEntry: vi.fn(),
    onResumeEntry: vi.fn(),
    onDeleteEntry: vi.fn(),
    onLoadEarlier: vi.fn(),
    onAddEntry: vi.fn(),
    ...overrides,
  }
  render(<TrackerScreen {...props} />)
  return props
}

describe('TrackerScreen — per-day Add button (BIZ-064)', () => {
  it('adds an entry prefilled with the group’s date', () => {
    const onAddEntry = vi.fn()
    renderScreen({
      today: '2026-07-10',
      groups: [group('2026-07-08', 'Tue, Jul 8', [entry('2026-07-08')])],
      onAddEntry,
    })
    fireEvent.click(screen.getByTestId('wk-add-day-2026-07-08'))
    expect(onAddEntry).toHaveBeenCalledWith('2026-07-08')
  })

  it('makes the Today Add primary and other days’ quiet', () => {
    renderScreen({
      today: '2026-07-10',
      groups: [
        group('2026-07-10', 'Today', [entry('2026-07-10')]),
        group('2026-07-08', 'Tue, Jul 8', [entry('2026-07-08')]),
      ],
    })
    expect(screen.getByTestId('wk-add-day-2026-07-10')).toHaveClass('is-today')
    expect(screen.getByTestId('wk-add-day-2026-07-08')).toHaveClass('is-quiet')
  })

  it('renders a Today group with an Add even when today has no entries', () => {
    renderScreen({
      today: '2026-07-10',
      groups: [group('2026-07-08', 'Tue, Jul 8', [entry('2026-07-08')])],
    })
    // A Today group is injected at the top with its own Add button.
    expect(screen.getByTestId('wk-add-day-2026-07-10')).toBeInTheDocument()
    expect(screen.getByText('Today')).toBeInTheDocument()
  })

  it('drops the global header "+ Add entry" button when there are entries', () => {
    renderScreen({
      today: '2026-07-10',
      groups: [group('2026-07-10', 'Today', [entry('2026-07-10')])],
    })
    expect(screen.queryByText('+ Add entry')).not.toBeInTheDocument()
  })
})
