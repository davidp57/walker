import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StaleTimerModal } from './StaleTimerModal'
import type { Entry } from '../types'

afterEach(() => cleanup())

const running: Entry = {
  id: '168',
  date: '2026-08-20',
  start: 600,
  end: null,
  codeId: '1',
  activity: 'Team meeting',
  description: '',
  source: 'timer',
}

function renderModal(overrides: Partial<Parameters<typeof StaleTimerModal>[0]> = {}) {
  const props = {
    entry: running,
    dayLabel: 'Yesterday',
    elapsedMinutes: 1382,
    onSetEnd: vi.fn(),
    onDiscard: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  }
  render(<StaleTimerModal {...props} />)
  return props
}

describe('StaleTimerModal (BIZ-091)', () => {
  it('names the day and the start time it has been running since', () => {
    renderModal()

    expect(screen.getByText(/still running from Yesterday/i)).toBeTruthy()
    expect(screen.getByText(/10:00/)).toBeTruthy()
    expect(screen.getByText(/23h 2m ago/)).toBeTruthy()
  })

  it('sends the end time entered as military digits', () => {
    const { onSetEnd } = renderModal()

    fireEvent.change(screen.getByPlaceholderText('1730'), { target: { value: '1045' } })
    fireEvent.click(screen.getByRole('button', { name: /set the end time/i }))

    expect(onSetEnd).toHaveBeenCalledWith(645)
  })

  it('refuses an end before the start rather than storing a negative duration', () => {
    const { onSetEnd } = renderModal()

    fireEvent.change(screen.getByPlaceholderText('1730'), { target: { value: '0902' } })
    fireEvent.click(screen.getByRole('button', { name: /set the end time/i }))

    expect(onSetEnd).not.toHaveBeenCalled()
    expect(screen.getByText(/at or after 10:00/i)).toBeTruthy()
  })

  it('asks for a time instead of submitting an empty field', () => {
    const { onSetEnd } = renderModal()

    fireEvent.click(screen.getByRole('button', { name: /set the end time/i }))

    expect(onSetEnd).not.toHaveBeenCalled()
    expect(screen.getByText(/enter the time you stopped/i)).toBeTruthy()
  })

  it('can discard the entry outright', () => {
    const { onDiscard } = renderModal()

    fireEvent.click(screen.getByRole('button', { name: /discard the entry/i }))

    expect(onDiscard).toHaveBeenCalled()
  })

  it('can be postponed — the prompt is not a trap', () => {
    const { onClose } = renderModal()

    fireEvent.click(screen.getByRole('button', { name: /^later$/i }))

    expect(onClose).toHaveBeenCalled()
  })
})
