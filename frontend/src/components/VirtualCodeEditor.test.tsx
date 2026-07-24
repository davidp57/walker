import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { VirtualCodeEditor } from './VirtualCodeEditor'
import type { TimesheetCode } from '../types'

afterEach(() => cleanup())

const realCode: TimesheetCode = {
  id: '1',
  number: 'N9/1042',
  label: 'MNT - PAP V4',
  name: 'Paper V4',
  color: '#5b9cf6',
  activities: [{ code: '0001', label: 'Bug fixing' }],
  isVirtual: false,
  realCodeId: null,
  realCodeNumber: null,
}

const otherRealCode: TimesheetCode = {
  id: '3',
  number: 'N9/2000',
  label: 'OTHER',
  name: 'Other',
  color: '#3fb68b',
  activities: [{ code: '0001', label: 'A' }],
  isVirtual: false,
  realCodeId: null,
  realCodeNumber: null,
}

const virtualCode: TimesheetCode = {
  id: '2',
  number: 'N9/1042',
  label: 'MNT - PAP V4',
  name: 'Workday contact info',
  color: '#abcdef',
  activities: [{ code: '0001', label: 'Bug fixing' }],
  isVirtual: true,
  realCodeId: '1',
  realCodeNumber: 'N9/1042',
}

describe('VirtualCodeEditor', () => {
  it('shows "New virtual code" and no delete button when creating', () => {
    render(
      <VirtualCodeEditor
        code={null}
        realCodes={[realCode, otherRealCode]}
        codes={[realCode, otherRealCode]}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('New virtual code')).toBeInTheDocument()
    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
  })

  it('prefills name, color, and target real code when editing', () => {
    render(
      <VirtualCodeEditor
        code={virtualCode}
        realCodes={[realCode, otherRealCode]}
        codes={[realCode, otherRealCode]}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('Edit virtual code')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Workday contact info')).toBeInTheDocument()
    expect(screen.getByDisplayValue('#abcdef')).toBeInTheDocument()
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(
      <VirtualCodeEditor
        code={virtualCode}
        realCodes={[realCode, otherRealCode]}
        codes={[realCode, otherRealCode]}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onClose={onClose}
      />,
    )

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('explains a disabled Save by naming the missing field', () => {
    render(
      <VirtualCodeEditor
        code={null}
        realCodes={[realCode, otherRealCode]}
        codes={[realCode, otherRealCode]}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onClose={vi.fn()}
      />,
    )

    // Creating: the backing code defaults to the first real code, but the name is still empty.
    expect(screen.getByTestId('wk-virtual-editor-save-hint')).toHaveTextContent(
      'Add a name to save',
    )
  })

  it('deletes only after an inline confirm, then closes', () => {
    const onDelete = vi.fn()
    const onClose = vi.fn()
    render(
      <VirtualCodeEditor
        code={virtualCode}
        realCodes={[realCode, otherRealCode]}
        codes={[realCode, otherRealCode]}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onDelete={onDelete}
        onClose={onClose}
      />,
    )

    // First Delete arms the confirm — nothing happens yet.
    fireEvent.click(screen.getByTestId('wk-virtual-editor-delete'))
    expect(onDelete).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByText('Delete this code?')).toBeInTheDocument()

    // Confirming commits and closes.
    fireEvent.click(screen.getByTestId('wk-virtual-editor-delete-confirm'))
    expect(onDelete).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('cancels the delete via Keep, leaving the code intact', () => {
    const onDelete = vi.fn()
    render(
      <VirtualCodeEditor
        code={virtualCode}
        realCodes={[realCode, otherRealCode]}
        codes={[realCode, otherRealCode]}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onDelete={onDelete}
        onClose={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByTestId('wk-virtual-editor-delete'))
    fireEvent.click(screen.getByTestId('wk-virtual-editor-delete-cancel'))

    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.getByTestId('wk-virtual-editor-delete')).toBeInTheDocument()
  })

  it('does not show a Delete button when onDelete is omitted', () => {
    render(
      <VirtualCodeEditor
        code={virtualCode}
        realCodes={[realCode, otherRealCode]}
        codes={[realCode, otherRealCode]}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onClose={vi.fn()}
      />,
    )

    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
  })

  it('calls onSave with the edited fields', () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <VirtualCodeEditor
        code={virtualCode}
        realCodes={[realCode, otherRealCode]}
        codes={[realCode, otherRealCode]}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByDisplayValue('Workday contact info'), {
      target: { value: 'Renamed project' },
    })
    fireEvent.click(screen.getByText('Save'))

    expect(onSave).toHaveBeenCalledWith({
      realCodeId: '1',
      name: 'Renamed project',
      color: '#abcdef',
    })
  })

  it('closes only after onSave resolves', async () => {
    let resolveSave: () => void = () => {}
    const onSave = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve
        }),
    )
    const onClose = vi.fn()
    render(
      <VirtualCodeEditor
        code={virtualCode}
        realCodes={[realCode, otherRealCode]}
        codes={[realCode, otherRealCode]}
        onSave={onSave}
        onClose={onClose}
      />,
    )

    fireEvent.click(screen.getByText('Save'))
    expect(onClose).not.toHaveBeenCalled()

    resolveSave()
    await vi.waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  })

  // BIZ-049 — searchable backing selector replacing the bare <select>.
  it('opens the backing picker and selecting a real code updates the trigger', () => {
    render(
      <VirtualCodeEditor
        code={null}
        realCodes={[realCode, otherRealCode]}
        codes={[realCode, otherRealCode]}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onClose={vi.fn()}
      />,
    )

    // Defaults to the first real code.
    expect(screen.getByTestId('wk-virtual-backing-trigger')).toHaveTextContent('N9/1042 · Paper V4')

    fireEvent.click(screen.getByTestId('wk-virtual-backing-trigger'))
    expect(screen.getByText('Backing real code')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Other'))

    expect(screen.getByTestId('wk-virtual-backing-trigger')).toHaveTextContent('N9/2000 · Other')
  })

  it('activates a reference code as the backing once it is created (the modal chain)', async () => {
    const created: TimesheetCode = {
      ...realCode,
      id: '99',
      number: 'N9/9999',
      name: 'Activated',
    }
    const ref = { id: 'r1', number: 'N9/9999', name: 'Activated', label: 'ACT', activities: [] }
    // Stand in for App: activation resolves synchronously to the created real code.
    const onActivateReference = vi.fn((_ref, onActivated: (c: TimesheetCode) => void) =>
      onActivated(created),
    )
    const { rerender } = render(
      <VirtualCodeEditor
        code={null}
        realCodes={[realCode]}
        codes={[realCode]}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onClose={vi.fn()}
        onSearchReference={async () => [ref]}
        onActivateReference={onActivateReference}
      />,
    )

    fireEvent.click(screen.getByTestId('wk-virtual-backing-trigger'))
    fireEvent.change(screen.getByPlaceholderText('Search code or activity…'), {
      target: { value: 'act' },
    })
    fireEvent.click(await screen.findByText('Activated'))

    expect(onActivateReference).toHaveBeenCalledWith(ref, expect.any(Function))

    // App reloads codes after the create — the new real code is now among realCodes.
    rerender(
      <VirtualCodeEditor
        code={null}
        realCodes={[realCode, created]}
        codes={[realCode, created]}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onClose={vi.fn()}
        onSearchReference={async () => [ref]}
        onActivateReference={onActivateReference}
      />,
    )
    expect(screen.getByTestId('wk-virtual-backing-trigger')).toHaveTextContent(
      'N9/9999 · Activated',
    )
  })

  it('keeps the modal open and shows an error when onSave rejects', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('name already exists'))
    const onClose = vi.fn()
    render(
      <VirtualCodeEditor
        code={virtualCode}
        realCodes={[realCode, otherRealCode]}
        codes={[realCode, otherRealCode]}
        onSave={onSave}
        onClose={onClose}
      />,
    )

    fireEvent.click(screen.getByText('Save'))

    expect(await screen.findByText('name already exists')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })
})
