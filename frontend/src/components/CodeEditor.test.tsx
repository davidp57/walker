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

// TEC-016 — Delete is hidden only for a real block (virtual codes pointing here), and says why.
// Entries no longer hide it: the client sees the loaded date window only, so the server decides
// and a blocked delete opens the BIZ-088 resolve flow.
describe('CodeEditor — delete affordance (TEC-016)', () => {
  const code = {
    id: '1',
    number: 'N9/1042',
    label: 'MNT - PAP',
    name: 'Paper',
    color: '#5b9cf6',
    activities: [],
    isVirtual: false,
    realCodeId: null,
    realCodeNumber: null,
  }

  it('offers Delete when nothing blocks it', () => {
    render(
      <CodeEditor code={code} codes={[]} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />,
    )

    expect(screen.getByTestId('wk-code-editor-delete')).toBeInTheDocument()
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('explains the block instead of silently omitting the control', () => {
    render(
      <CodeEditor
        code={code}
        codes={[]}
        onSave={vi.fn()}
        onClose={vi.fn()}
        deleteBlockedReason="Virtual codes point at this one — delete those first."
      />,
    )

    expect(screen.queryByTestId('wk-code-editor-delete')).not.toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent('delete those first')
  })
})
