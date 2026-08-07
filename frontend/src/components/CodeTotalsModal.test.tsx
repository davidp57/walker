import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CodeTotalsModal } from './CodeTotalsModal'
import type { CodeTotals, TimesheetCode } from '../types'

afterEach(() => cleanup())

const code: TimesheetCode = {
  id: '10',
  number: 'N9/1042',
  label: 'MNT - PAP V4',
  name: 'Paper V4',
  color: '#5b9cf6',
  activities: [{ code: '0001', label: 'Build' }],
  isVirtual: false,
  realCodeId: null,
  realCodeNumber: null,
}

const totals = (overrides: Partial<CodeTotals> = {}): CodeTotals => ({
  codeId: '10',
  start: null,
  end: null,
  minutes: 750,
  entries: 12,
  days: 5,
  byActivity: [
    { activity: 'Build', minutes: 600, entries: 9 },
    { activity: 'Support', minutes: 150, entries: 3 },
  ],
  running: false,
  rollup: null,
  ...overrides,
})

function renderModal(overrides: Partial<Parameters<typeof CodeTotalsModal>[0]> = {}) {
  const props = {
    code,
    periodStart: '2026-08-01',
    periodEnd: '2026-08-15',
    today: '2026-08-07',
    onFetch: vi.fn().mockResolvedValue(totals()),
    onClose: vi.fn(),
    ...overrides,
  }
  render(<CodeTotalsModal {...props} />)
  return props
}

describe('CodeTotalsModal (BIZ-089)', () => {
  it('opens on all time — the form of the question that needs no dates', async () => {
    const onFetch = vi.fn().mockResolvedValue(totals())
    renderModal({ onFetch })

    await waitFor(() => expect(onFetch).toHaveBeenCalledWith({}))
    expect(screen.getByRole('radio', { name: 'All time' })).toBeChecked()
  })

  it('shows the total, the entry count and the number of days worked', async () => {
    renderModal()

    expect(await screen.findByText('12h 30m')).toBeInTheDocument()
    const body = document.body.textContent ?? ''
    expect(body).toContain('12 entries')
    expect(body).toContain('5 days')
  })

  it('breaks the total down per activity', async () => {
    renderModal()

    expect(await screen.findByText('Build')).toBeInTheDocument()
    expect(screen.getByText('10h')).toBeInTheDocument()
    expect(screen.getByText('Support')).toBeInTheDocument()
    expect(screen.getByText('2h 30m')).toBeInTheDocument()
  })

  it('labels entries with no activity rather than dropping them', async () => {
    renderModal({
      onFetch: vi
        .fn()
        .mockResolvedValue(totals({ byActivity: [{ activity: null, minutes: 750, entries: 12 }] })),
    })

    expect(await screen.findByText('No activity')).toBeInTheDocument()
  })

  it('refetches with the range when a preset is picked', async () => {
    const onFetch = vi.fn().mockResolvedValue(totals())
    renderModal({ onFetch })
    await waitFor(() => expect(onFetch).toHaveBeenCalledWith({}))

    fireEvent.click(screen.getByRole('radio', { name: 'This month' }))

    await waitFor(() =>
      expect(onFetch).toHaveBeenCalledWith({ from: '2026-08-01', to: '2026-08-31' }),
    )
  })

  it('uses the Timesheet period bounds for the current-period preset', async () => {
    const onFetch = vi.fn().mockResolvedValue(totals())
    renderModal({ onFetch })

    fireEvent.click(screen.getByRole('radio', { name: 'Current period' }))

    await waitFor(() =>
      expect(onFetch).toHaveBeenCalledWith({ from: '2026-08-01', to: '2026-08-15' }),
    )
  })

  it('accepts an explicit custom range', async () => {
    const onFetch = vi.fn().mockResolvedValue(totals())
    renderModal({ onFetch })

    fireEvent.click(screen.getByRole('radio', { name: 'Custom' }))
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-01-01' } })
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-03-31' } })

    await waitFor(() =>
      expect(onFetch).toHaveBeenCalledWith({ from: '2026-01-01', to: '2026-03-31' }),
    )
  })

  it('says a timer is running rather than silently under-reporting', async () => {
    renderModal({ onFetch: vi.fn().mockResolvedValue(totals({ running: true })) })

    expect(await screen.findByText(/timer is running/i)).toBeInTheDocument()
  })

  it('shows the roll-up separately from the code’s own time', async () => {
    renderModal({
      onFetch: vi
        .fn()
        .mockResolvedValue(totals({ rollup: { minutes: 900, entries: 15, days: 6 } })),
    })

    expect(await screen.findByText('12h 30m')).toBeInTheDocument()
    expect(screen.getByText('15h')).toBeInTheDocument()
    expect(document.body.textContent).toMatch(/virtual codes/i)
  })

  it('distinguishes "nothing in this range" from "nothing ever"', async () => {
    const empty = totals({ minutes: 0, entries: 0, days: 0, byActivity: [] })
    const onFetch = vi.fn().mockResolvedValue(empty)
    renderModal({ onFetch })

    expect(await screen.findByText(/no time recorded on this code yet/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: 'This month' }))
    expect(await screen.findByText(/no time recorded in this range/i)).toBeInTheDocument()
  })

  it('is a labelled dialog that can be dismissed', async () => {
    const onClose = vi.fn()
    renderModal({ onClose })

    expect(await screen.findByRole('dialog', { name: /paper v4/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('exposes the range picker as a labelled radiogroup', async () => {
    renderModal()

    expect(await screen.findByRole('radiogroup', { name: /range/i })).toBeInTheDocument()
  })
})
