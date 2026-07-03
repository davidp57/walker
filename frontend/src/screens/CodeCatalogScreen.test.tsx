import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CodeCatalogScreen } from './CodeCatalogScreen'
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

function renderScreen(
  codes: TimesheetCode[],
  onNewVirtual = vi.fn(),
  onEdit = vi.fn(),
  onEditVirtual = vi.fn(),
) {
  render(
    <CodeCatalogScreen
      codes={codes}
      onNew={vi.fn()}
      onNewVirtual={onNewVirtual}
      onEdit={onEdit}
      onEditVirtual={onEditVirtual}
      onDelete={vi.fn()}
      isCodeInUse={() => false}
      onSearchReference={async () => []}
      onAddCode={vi.fn()}
    />,
  )
}

describe('CodeCatalogScreen', () => {
  it('shows a virtual badge and the backing real code for a virtual code', () => {
    renderScreen([realCode, virtualCode])

    expect(screen.getByText('virtual')).toBeInTheDocument()
    expect(screen.getByText(/backed by N9\/1042/)).toBeInTheDocument()
  })

  it('does not show a virtual badge for a real code', () => {
    renderScreen([realCode])

    expect(screen.queryByText('virtual')).not.toBeInTheDocument()
  })

  it('calls onNewVirtual when "New virtual code" is clicked', () => {
    const onNewVirtual = vi.fn()
    renderScreen([realCode], onNewVirtual)

    fireEvent.click(screen.getByText('+ New virtual code'))

    expect(onNewVirtual).toHaveBeenCalledOnce()
  })

  it('routes the Edit button to onEdit for a real code', () => {
    const onEdit = vi.fn()
    const onEditVirtual = vi.fn()
    renderScreen([realCode], vi.fn(), onEdit, onEditVirtual)

    fireEvent.click(screen.getByText('Edit'))

    expect(onEdit).toHaveBeenCalledWith(realCode)
    expect(onEditVirtual).not.toHaveBeenCalled()
  })

  it('routes the Edit button to onEditVirtual for a virtual code', () => {
    const onEdit = vi.fn()
    const onEditVirtual = vi.fn()
    renderScreen([virtualCode], vi.fn(), onEdit, onEditVirtual)

    fireEvent.click(screen.getByText('Edit'))

    expect(onEditVirtual).toHaveBeenCalledWith(virtualCode)
    expect(onEdit).not.toHaveBeenCalled()
  })
})
