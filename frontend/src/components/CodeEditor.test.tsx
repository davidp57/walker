import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CodeEditor } from './CodeEditor'

afterEach(() => cleanup())

describe('CodeEditor', () => {
  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(<CodeEditor code={null} codes={[]} onSave={vi.fn()} onClose={onClose} />)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('explains a disabled Save by naming the missing fields', () => {
    render(<CodeEditor code={null} codes={[]} onSave={vi.fn()} onClose={vi.fn()} />)

    // A brand-new code has no number, label, or activity yet.
    expect(screen.getByTestId('wk-code-editor-save-hint')).toHaveTextContent(
      'Add a number, a technical label and an activity to save',
    )
  })

  it('drops the hint once the required fields are filled', () => {
    render(<CodeEditor code={null} codes={[]} onSave={vi.fn()} onClose={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('N9/1042'), { target: { value: 'N9/9' } })
    fireEvent.change(screen.getByPlaceholderText('MNT - PAP V4'), { target: { value: 'MNT - X' } })
    // The first activity row's label input — fill it so there's a clean activity.
    fireEvent.change(screen.getByPlaceholderText('Bug fixing'), { target: { value: 'Dev' } })

    expect(screen.queryByTestId('wk-code-editor-save-hint')).not.toBeInTheDocument()
  })
})
