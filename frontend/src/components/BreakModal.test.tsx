import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BreakModal } from './BreakModal'
import type { Entry } from '../types'

afterEach(() => cleanup())

const entry: Entry = {
  id: '1',
  date: '2026-07-02',
  start: 540, // 09:00
  end: 780, // 13:00
  codeId: null,
  activity: null,
  description: '',
}

function renderModal(onApply = vi.fn(), onClose = vi.fn()) {
  render(
    <BreakModal entry={entry} nowMinute={900} codes={[]} onApply={onApply} onClose={onClose} />,
  )
  return { onApply, onClose }
}

describe('BreakModal (BIZ-076)', () => {
  it('applies the break with the parsed start/end minutes and an empty (untracked) hole', () => {
    const { onApply, onClose } = renderModal()

    fireEvent.change(screen.getByPlaceholderText('1200'), { target: { value: '1200' } })
    fireEvent.change(screen.getByPlaceholderText('1220'), { target: { value: '1220' } })
    fireEvent.click(screen.getByText('Insert break'))

    expect(onApply).toHaveBeenCalledWith({
      breakStartMinute: 720,
      breakEndMinute: 740,
      timesheetCodeId: null,
      activity: null,
    })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('recomputes the end when the duration changes (linked triptych)', () => {
    const { onApply } = renderModal()

    fireEvent.change(screen.getByPlaceholderText('1200'), { target: { value: '1200' } })
    fireEvent.change(screen.getByPlaceholderText('0:20'), { target: { value: '0:30' } })
    fireEvent.click(screen.getByText('Insert break'))

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ breakStartMinute: 720, breakEndMinute: 750 }),
    )
  })

  it('rejects a break that falls outside the entry', () => {
    const { onApply } = renderModal()

    fireEvent.change(screen.getByPlaceholderText('1200'), { target: { value: '0800' } }) // before 09:00
    fireEvent.change(screen.getByPlaceholderText('1220'), { target: { value: '0820' } })
    fireEvent.click(screen.getByText('Insert break'))

    expect(onApply).not.toHaveBeenCalled()
    expect(screen.getByText(/must fall between/i)).toBeInTheDocument()
  })
})
