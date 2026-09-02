import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ImportCatalogModal } from './ImportCatalogModal'

afterEach(() => cleanup())

function renderModal(onImport = vi.fn(async () => undefined), onClose = vi.fn()) {
  render(<ImportCatalogModal fileName="walker-catalog.csv" onImport={onImport} onClose={onClose} />)
  return { onImport, onClose }
}

const completeCheckbox = () =>
  screen
    .getByText(/This file is my complete catalog/)
    .closest('label')!
    .querySelector('input')!

describe('ImportCatalogModal (TEC-019)', () => {
  it('names the file being imported', () => {
    renderModal()

    expect(screen.getByText(/walker-catalog\.csv/)).toBeTruthy()
  })

  it('imports as a partial catalog by default, so nothing is pruned by accident', () => {
    const { onImport } = renderModal()

    fireEvent.click(screen.getByText('Import'))

    expect(onImport).toHaveBeenCalledWith(false)
  })

  it('imports as the complete catalog once the box is ticked', () => {
    const { onImport } = renderModal()

    fireEvent.click(completeCheckbox())
    fireEvent.click(screen.getByText('Import'))

    expect(onImport).toHaveBeenCalledWith(true)
  })

  it('spells out what pruning does only once it is armed', () => {
    renderModal()
    expect(screen.queryByText(/Only the\s+reference catalog is pruned/)).toBeNull()

    fireEvent.click(completeCheckbox())

    expect(screen.getByText(/Only the\s+reference catalog is pruned/)).toBeTruthy()
  })

  it('closes without importing on Cancel', () => {
    const { onImport, onClose } = renderModal()

    fireEvent.click(screen.getByText('Cancel'))

    expect(onClose).toHaveBeenCalledOnce()
    expect(onImport).not.toHaveBeenCalled()
  })
})
