import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CodeCatalogScreen } from './CodeCatalogScreen'
import type { ReferenceCode, TimesheetCode } from '../types'

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
      onActivateReference={vi.fn()}
    />,
  )
}

describe('CodeCatalogScreen', () => {
  it('marks a virtual code with a distinct "virtual" badge', () => {
    renderScreen([realCode, virtualCode])

    expect(screen.getByText('virtual')).toBeInTheDocument()
  })

  it('shows "backed by" only when the backing code differs from the shown number', () => {
    // The shared fixture borrows its backing code's number, so "backed by" would just repeat it.
    const distinct: TimesheetCode = {
      ...virtualCode,
      id: '3',
      name: 'Distinct backing',
      realCodeNumber: 'N9/7777',
    }
    renderScreen([virtualCode, distinct])

    expect(screen.queryByText(/backed by N9\/1042/)).not.toBeInTheDocument()
    expect(screen.getByText(/backed by N9\/7777/)).toBeInTheDocument()
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

  it('removes a code only after an inline confirm (✕ → Remove)', () => {
    const onDelete = vi.fn()
    render(
      <CodeCatalogScreen
        codes={[realCode]}
        onNew={vi.fn()}
        onNewVirtual={vi.fn()}
        onEdit={vi.fn()}
        onEditVirtual={vi.fn()}
        onDelete={onDelete}
        isCodeInUse={() => false}
        onSearchReference={async () => []}
        onActivateReference={vi.fn()}
      />,
    )

    // First ✕ arms the confirm — nothing removed yet.
    fireEvent.click(screen.getByTestId('wk-catalog-delete-1'))
    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.getByText('Remove?')).toBeInTheDocument()

    // Confirming removes the code.
    fireEvent.click(screen.getByTestId('wk-catalog-delete-1-confirm'))
    expect(onDelete).toHaveBeenCalledWith(realCode)
  })

  it('cancels a code removal via Keep', () => {
    const onDelete = vi.fn()
    render(
      <CodeCatalogScreen
        codes={[realCode]}
        onNew={vi.fn()}
        onNewVirtual={vi.fn()}
        onEdit={vi.fn()}
        onEditVirtual={vi.fn()}
        onDelete={onDelete}
        isCodeInUse={() => false}
        onSearchReference={async () => []}
        onActivateReference={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByTestId('wk-catalog-delete-1'))
    fireEvent.click(screen.getByTestId('wk-catalog-delete-1-cancel'))

    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.getByTestId('wk-catalog-delete-1')).toBeInTheDocument()
  })

  it('keeps an in-use code’s remove control disabled with no confirm', () => {
    render(
      <CodeCatalogScreen
        codes={[realCode]}
        onNew={vi.fn()}
        onNewVirtual={vi.fn()}
        onEdit={vi.fn()}
        onEditVirtual={vi.fn()}
        onDelete={vi.fn()}
        isCodeInUse={() => true}
        onSearchReference={async () => []}
        onActivateReference={vi.fn()}
      />,
    )

    const remove = screen.getByTestId('wk-catalog-delete-1')
    expect(remove).toBeDisabled()
    fireEvent.click(remove)
    expect(screen.queryByText('Remove?')).not.toBeInTheDocument()
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

  it('collapses a multi-activity code behind a count, expandable on click (BIZ-045)', () => {
    const multi: TimesheetCode = {
      ...realCode,
      id: '3',
      name: 'Multi',
      activities: [
        { code: '1', label: 'Alpha' },
        { code: '2', label: 'Beta' },
        { code: '3', label: 'Gamma' },
      ],
    }
    renderScreen([multi])

    expect(screen.getByText(/3 activities/)).toBeInTheDocument()
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText(/3 activities/))
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Gamma')).toBeInTheDocument()
  })

  it('fuzzy-filters the displayed list by the search query (BIZ-073)', () => {
    const hrhub: TimesheetCode = {
      ...realCode,
      id: '9',
      name: 'Mnt - HR Hub',
      number: 'N9/6149505/020',
      label: 'HR',
    }
    renderScreen([realCode, hrhub])
    // Both codes visible before searching.
    expect(screen.getByText('Paper V4')).toBeInTheDocument()
    expect(screen.getByText('Mnt - HR Hub')).toBeInTheDocument()

    // "HRHUB" (no space) fuzzy-matches "HR Hub" and hides the non-matching code.
    fireEvent.change(screen.getByPlaceholderText(/search your codes/i), {
      target: { value: 'HRHUB' },
    })
    expect(screen.getByText('Mnt - HR Hub')).toBeInTheDocument()
    expect(screen.queryByText('Paper V4')).not.toBeInTheDocument()
  })

  it('shows a no-match message when the query matches none of your codes (BIZ-073)', () => {
    renderScreen([realCode])
    fireEvent.change(screen.getByPlaceholderText(/search your codes/i), {
      target: { value: 'zzzznomatch' },
    })
    expect(screen.getByText(/No codes match/i)).toBeInTheDocument()
    expect(screen.queryByText('Paper V4')).not.toBeInTheDocument()
  })

  it('lists codes alphabetically by name (BIZ-073)', () => {
    const zebra: TimesheetCode = { ...realCode, id: '7', name: 'Zebra' }
    const apple: TimesheetCode = { ...realCode, id: '8', name: 'Apple' }
    renderScreen([zebra, apple])
    const names = screen.getAllByText(/Zebra|Apple/).map((el) => el.textContent)
    expect(names).toEqual(['Apple', 'Zebra'])
  })

  it('renders reference matches as an in-flow section and activates one on click (BIZ-074)', async () => {
    const ref: ReferenceCode = {
      id: 'r1',
      number: 'N9/9999/010',
      name: 'Team huddle',
      label: 'HUD',
      activities: [],
    }
    const onActivateReference = vi.fn()
    render(
      <CodeCatalogScreen
        codes={[realCode]}
        onNew={vi.fn()}
        onNewVirtual={vi.fn()}
        onEdit={vi.fn()}
        onEditVirtual={vi.fn()}
        onDelete={vi.fn()}
        isCodeInUse={() => false}
        onSearchReference={async () => [ref]}
        onActivateReference={onActivateReference}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText(/search your codes/i), {
      target: { value: 'team' },
    })

    // The suggestion appears (debounced), in the dedicated add-from-reference section.
    expect(await screen.findByText(/Add from your reference catalog/i)).toBeInTheDocument()
    const suggestion = await screen.findByText('Team huddle')
    // It is not inside the active-codes list (no overlay): its section is a separate <section>.
    expect(suggestion.closest('.wk-catalog-list')).toBeNull()

    fireEvent.click(suggestion)
    expect(onActivateReference).toHaveBeenCalledWith(ref)
  })

  it('shows no reference section for an empty query (BIZ-074)', async () => {
    render(
      <CodeCatalogScreen
        codes={[realCode]}
        onNew={vi.fn()}
        onNewVirtual={vi.fn()}
        onEdit={vi.fn()}
        onEditVirtual={vi.fn()}
        onDelete={vi.fn()}
        isCodeInUse={() => false}
        onSearchReference={async () => [
          { id: 'r1', number: 'N9/9999/010', name: 'Team huddle', label: 'HUD', activities: [] },
        ]}
        onActivateReference={vi.fn()}
      />,
    )
    // Give any debounced search a chance to (not) fire.
    await waitFor(() =>
      expect(screen.queryByText(/Add from your reference catalog/i)).not.toBeInTheDocument(),
    )
  })

  it('guides the two-tier model and links the docs in the empty state (BIZ-046)', () => {
    renderScreen([])

    expect(screen.getByText('Nothing on the books yet.')).toBeInTheDocument()
    expect(screen.getByText(/two tiers/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Importing your code catalog/ })).toHaveAttribute(
      'href',
      'https://davidp57.github.io/walker/catalog-import/',
    )
  })
})
