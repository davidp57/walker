import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CodePicker } from './CodePicker'
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

function renderPicker(overrides: Partial<Parameters<typeof CodePicker>[0]> = {}) {
  render(
    <CodePicker
      title="Categorize entry"
      codes={[realCode, virtualCode]}
      onPick={vi.fn()}
      onClose={vi.fn()}
      {...overrides}
    />,
  )
}

describe('CodePicker', () => {
  it('lists both real and virtual codes', () => {
    renderPicker()

    expect(screen.getByText('Paper V4')).toBeInTheDocument()
    expect(screen.getByText('Workday contact info')).toBeInTheDocument()
  })

  it('tags a virtual code with a "virtual" badge', () => {
    renderPicker()

    expect(screen.getByText('virtual')).toBeInTheDocument()
  })

  it('does not tag a real code with a "virtual" badge', () => {
    renderPicker({ codes: [realCode] })

    expect(screen.queryByText('virtual')).not.toBeInTheDocument()
  })

  it('picking a virtual code activity calls onPick with the virtual code id', () => {
    const onPick = vi.fn()
    renderPicker({ onPick })

    fireEvent.click(screen.getAllByText('Bug fixing')[1])

    expect(onPick).toHaveBeenCalledWith('2', 'Bug fixing')
  })

  it('picking a real code activity is unchanged', () => {
    const onPick = vi.fn()
    renderPicker({ onPick })

    fireEvent.click(screen.getAllByText('Bug fixing')[0])

    expect(onPick).toHaveBeenCalledWith('1', 'Bug fixing')
  })

  it('offers "Create a new virtual code" alongside the real one when nothing matches', () => {
    const onCreateNew = vi.fn()
    const onCreateNewVirtual = vi.fn()
    renderPicker({ codes: [], onCreateNew, onCreateNewVirtual })

    fireEvent.change(screen.getByPlaceholderText('Search code or activity…'), {
      target: { value: 'Nonexistent' },
    })

    fireEvent.click(screen.getByText('➕ Create a new code'))
    expect(onCreateNew).toHaveBeenCalledWith('Nonexistent')

    fireEvent.click(screen.getByText('➕ Create a new virtual code'))
    expect(onCreateNewVirtual).toHaveBeenCalledWith('Nonexistent')
  })

  it('does not offer "Create a new virtual code" when the callback is not provided', () => {
    renderPicker({ codes: [] })

    fireEvent.change(screen.getByPlaceholderText('Search code or activity…'), {
      target: { value: 'Nonexistent' },
    })

    expect(screen.queryByText('➕ Create a new virtual code')).not.toBeInTheDocument()
  })

  it('in codeOnly mode, picks a code on a single click with no activity step', () => {
    const onPick = vi.fn()
    renderPicker({ codeOnly: true, onPick })

    // No activity buttons are shown in code-only mode.
    expect(screen.queryByText('Bug fixing')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Paper V4'))

    expect(onPick).toHaveBeenCalledWith('1')
  })

  it('in codeOnly mode, still lists codes that have no activities', () => {
    const noActivities: TimesheetCode = {
      ...realCode,
      id: '3',
      name: 'No-activity code',
      activities: [],
    }
    renderPicker({ codeOnly: true, codes: [noActivities] })

    expect(screen.getByText('No-activity code')).toBeInTheDocument()
  })

  // BIZ-049 — tiered search.
  it('sorts Tier-1 results by project name, not by number', () => {
    const zebra: TimesheetCode = { ...realCode, id: '10', name: 'Zebra', number: 'A1' }
    const apple: TimesheetCode = { ...realCode, id: '11', name: 'Apple', number: 'Z9' }
    const { container } = render(
      <CodePicker
        codeOnly
        title="Task code"
        codes={[zebra, apple]}
        onPick={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    const names = Array.from(container.querySelectorAll('.wk-picker-name')).map(
      (n) => n.textContent,
    )
    expect(names).toEqual(['Apple', 'Zebra'])
  })

  it('excludes virtual codes from Tier 1 when realOnly', () => {
    renderPicker({ codeOnly: true, realOnly: true })
    expect(screen.getByText('Paper V4')).toBeInTheDocument()
    expect(screen.queryByText('Workday contact info')).not.toBeInTheDocument()
  })

  it('activates a Tier-2 reference code through onActivateReference', async () => {
    const onActivateReference = vi.fn()
    const ref = { id: 'r1', number: 'N9/9', name: 'Ref Project', label: 'REF', activities: [] }
    renderPicker({
      codes: [],
      onSearchReference: async () => [ref],
      onActivateReference,
    })

    fireEvent.change(screen.getByPlaceholderText('Search code or activity…'), {
      target: { value: 'ref' },
    })

    fireEvent.click(await screen.findByText('Ref Project'))
    expect(onActivateReference).toHaveBeenCalledWith(ref)
  })
})
