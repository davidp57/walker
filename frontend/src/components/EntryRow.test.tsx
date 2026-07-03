import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EntryRow } from './EntryRow'
import type { Entry, TimesheetCode } from '../types'

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
