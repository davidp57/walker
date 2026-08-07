import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BlockingEntriesModal } from './BlockingEntriesModal'
import type { BlockingEntries, TimesheetCode } from '../types'

afterEach(() => cleanup())

const code: TimesheetCode = {
  id: '10',
  number: 'N9/1042',
  label: 'MNT - PAP V4',
  name: 'Paper V4',
  color: '#5b9cf6',
  activities: [{ code: '0001', label: 'Bug fixing' }],
  isVirtual: false,
  realCodeId: null,
  realCodeNumber: null,
}

const target: TimesheetCode = { ...code, id: '11', number: 'N9/2000', name: 'Other project' }

const blocking = (overrides: Partial<BlockingEntries> = {}): BlockingEntries => ({
  total: 2,
  own: 2,
  others: 0,
  firstDate: '2026-07-03',
  lastDate: '2026-07-10',
  minutes: 150,
  entries: [
    {
      id: '1',
      date: '2026-07-10',
      start: 540,
      end: 630,
      codeId: '10',
      activity: 'Bug fixing',
      description: 'Fixing the grid',
    },
    {
      id: '2',
      date: '2026-07-03',
      start: 540,
      end: 600,
      codeId: '10',
      activity: 'Bug fixing',
      description: '',
    },
  ],
  ...overrides,
})

function renderModal(overrides: Partial<Parameters<typeof BlockingEntriesModal>[0]> = {}) {
  const props = {
    code,
    codes: [code, target],
    blocking: blocking(),
    onReassign: vi.fn().mockResolvedValue(undefined),
    onDeleteEntries: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn(),
    ...overrides,
  }
  render(<BlockingEntriesModal {...props} />)
  return props
}

describe('BlockingEntriesModal (BIZ-088)', () => {
  it('explains the block: how many, over what range, for how long', () => {
    renderModal()

    const body = document.body.textContent ?? ''
    expect(body).toContain('2 entries')
    expect(body).toMatch(/2h 30m/)
    expect(body).toContain('3 Jul')
    expect(body).toContain('10 Jul')
  })

  it('lists the blocking entries so they can be recognised', () => {
    renderModal()

    expect(screen.getByText('Fixing the grid')).toBeInTheDocument()
  })

  it('says when some entries belong to another member and cannot be resolved here', () => {
    renderModal({ blocking: blocking({ total: 5, own: 2, others: 3 }) })

    expect(document.body.textContent).toMatch(/3 .*another member/i)
  })

  it('does not claim someone else owns entries when they are all yours', () => {
    renderModal()

    expect(document.body.textContent).not.toMatch(/another member/i)
  })

  it('reassigns to the code and activity picked', async () => {
    const onReassign = vi.fn().mockResolvedValue(undefined)
    renderModal({ onReassign })

    fireEvent.click(screen.getByRole('button', { name: /reassign/i }))
    fireEvent.click(await screen.findByText('Other project'))
    fireEvent.click(screen.getByRole('button', { name: 'Bug fixing' }))

    expect(onReassign).toHaveBeenCalledWith('11', 'Bug fixing')
  })

  it('requires a deliberate second step before deleting, and says what is lost', () => {
    const onDeleteEntries = vi.fn().mockResolvedValue(undefined)
    renderModal({ onDeleteEntries })

    fireEvent.click(screen.getByRole('button', { name: /delete these entries/i }))

    expect(onDeleteEntries).not.toHaveBeenCalled()
    expect(document.body.textContent).toMatch(/2h 30m/)

    fireEvent.click(screen.getByTestId('wk-blocking-delete-confirm'))
    expect(onDeleteEntries).toHaveBeenCalled()
  })

  it('offers no resolve action when every blocking entry belongs to someone else', () => {
    renderModal({ blocking: blocking({ total: 3, own: 0, others: 3, entries: [] }) })

    expect(screen.queryByRole('button', { name: /reassign/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete these entries/i })).not.toBeInTheDocument()
  })

  it('is a labelled dialog that can be dismissed', () => {
    const onClose = vi.fn()
    renderModal({ onClose })

    expect(screen.getByRole('dialog', { name: /paper v4/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalled()
  })
})
