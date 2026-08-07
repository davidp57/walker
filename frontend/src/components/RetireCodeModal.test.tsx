import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RetireCodeModal } from './RetireCodeModal'
import type { TimesheetCode } from '../types'

afterEach(() => cleanup())

const realCode: TimesheetCode = {
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

const successor: TimesheetCode = { ...realCode, id: '11', number: 'N9/2000', name: 'Successor' }
const virtualCode: TimesheetCode = {
  ...realCode,
  id: '12',
  name: 'My sub-project',
  isVirtual: true,
}

function renderModal(overrides: Partial<Parameters<typeof RetireCodeModal>[0]> = {}) {
  const props = {
    code: realCode,
    codes: [realCode, successor, virtualCode],
    periodStart: '2026-08-01',
    periodEnd: '2026-08-15',
    onRetire: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn(),
    ...overrides,
  }
  render(<RetireCodeModal {...props} />)
  return props
}

describe('RetireCodeModal (BIZ-090)', () => {
  it('retires with no sweep by default — nothing is moved unless asked', async () => {
    const onRetire = vi.fn().mockResolvedValue(undefined)
    renderModal({ onRetire })

    fireEvent.click(screen.getByRole('button', { name: /retire this code/i }))

    await waitFor(() => expect(onRetire).toHaveBeenCalledWith(undefined))
  })

  it('names the open period it would sweep, so the scope is never a guess', () => {
    renderModal()

    const body = document.body.textContent ?? ''
    expect(body).toContain('1 Aug')
    expect(body).toContain('15 Aug')
  })

  it('sweeps the open period onto the picked code and activity', async () => {
    const onRetire = vi.fn().mockResolvedValue(undefined)
    renderModal({ onRetire })

    fireEvent.click(screen.getByRole('checkbox', { name: /move/i }))
    fireEvent.click(screen.getByRole('button', { name: /choose a replacement/i }))
    // Several codes carry a "Build" activity, so pick the one inside Successor's own row.
    const row = (await screen.findByText('Successor')).closest('.wk-picker-code')
    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: 'Build' }))
    fireEvent.click(screen.getByRole('button', { name: /retire this code/i }))

    await waitFor(() =>
      expect(onRetire).toHaveBeenCalledWith({
        targetCodeId: '11',
        activity: 'Build',
        start: '2026-08-01',
        end: '2026-08-15',
      }),
    )
  })

  it('will not retire with the sweep armed but no replacement chosen', () => {
    const onRetire = vi.fn()
    renderModal({ onRetire })

    fireEvent.click(screen.getByRole('checkbox', { name: /move/i }))

    expect(screen.getByRole('button', { name: /retire this code/i })).toBeDisabled()
    expect(onRetire).not.toHaveBeenCalled()
  })

  it('warns that retiring a real code applies to the whole organization', () => {
    renderModal()

    expect(screen.getByRole('note')).toHaveTextContent(/organization/i)
  })

  it('does not show the organization warning for a virtual code, which is personal', () => {
    renderModal({ code: virtualCode })

    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('never offers the retiring code as its own replacement', async () => {
    renderModal()

    fireEvent.click(screen.getByRole('checkbox', { name: /move/i }))
    fireEvent.click(screen.getByRole('button', { name: /choose a replacement/i }))

    expect(await screen.findByText('Successor')).toBeInTheDocument()
    expect(screen.queryByText('Paper V4')).not.toBeInTheDocument()
  })

  it('is a labelled dialog that can be dismissed', () => {
    const onClose = vi.fn()
    renderModal({ onClose })

    expect(screen.getByRole('dialog', { name: /paper v4/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalled()
  })
})
