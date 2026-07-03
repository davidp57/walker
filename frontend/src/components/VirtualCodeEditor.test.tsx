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
        onSave={vi.fn()}
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
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('Edit virtual code')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Workday contact info')).toBeInTheDocument()
    expect(screen.getByDisplayValue('#abcdef')).toBeInTheDocument()
  })

  it('shows a Delete button when onDelete is provided, and calls it on click', () => {
    const onDelete = vi.fn()
    const onClose = vi.fn()
    render(
      <VirtualCodeEditor
        code={virtualCode}
        realCodes={[realCode, otherRealCode]}
        onSave={vi.fn()}
        onDelete={onDelete}
        onClose={onClose}
      />,
    )

    fireEvent.click(screen.getByText('Delete'))

    expect(onDelete).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not show a Delete button when onDelete is omitted', () => {
    render(
      <VirtualCodeEditor
        code={virtualCode}
        realCodes={[realCode, otherRealCode]}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
  })

  it('calls onSave with the edited fields', () => {
    const onSave = vi.fn()
    render(
      <VirtualCodeEditor
        code={virtualCode}
        realCodes={[realCode, otherRealCode]}
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
})
