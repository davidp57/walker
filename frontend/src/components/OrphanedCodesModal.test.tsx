import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OrphanedCodesModal } from './OrphanedCodesModal'
import type { OrphanedCode } from '../lib/api'

afterEach(() => cleanup())

const plain: OrphanedCode = {
  id: '1',
  number: 'N9/6029442/010',
  name: 'Mnt - ScanUp',
  backingOnly: false,
  virtualCodes: [],
}

const backing: OrphanedCode = {
  id: '2',
  number: 'N9/6183466/040',
  name: 'Prj - Techno Transfo - Cloud Migration',
  backingOnly: true,
  virtualCodes: [{ id: '9', name: 'PRJ - Workday Interview Planner' }],
}

function renderModal(orphaned: OrphanedCode[]) {
  const onRetire = vi.fn(async () => undefined)
  const onRepoint = vi.fn()
  const onClose = vi.fn()
  render(
    <OrphanedCodesModal
      orphaned={orphaned}
      onRetire={onRetire}
      onRepoint={onRepoint}
      onClose={onClose}
    />,
  )
  return { onRetire, onRepoint, onClose }
}

describe('OrphanedCodesModal (BIZ-092)', () => {
  it('names each code the imported catalog no longer contains', () => {
    renderModal([plain, backing])

    expect(screen.getByText('Mnt - ScanUp')).toBeTruthy()
    expect(screen.getByText('N9/6029442/010')).toBeTruthy()
    expect(screen.getByText('2 of your codes are not in this catalog')).toBeTruthy()
  })

  it('names the virtual codes charging through a missing backing', () => {
    renderModal([backing])

    expect(screen.getByText(/PRJ - Workday Interview Planner/)).toBeTruthy()
  })

  it('offers repointing only where something actually depends on the code', () => {
    renderModal([plain])

    expect(screen.queryByText(/Repoint to another code/)).toBeNull()
  })

  it('retires a code on request', () => {
    const { onRetire } = renderModal([plain])

    fireEvent.click(screen.getByText('Retire it'))

    expect(onRetire).toHaveBeenCalledWith(plain)
  })

  it('hands repointing back to the caller so a replacement can be picked', () => {
    const { onRepoint } = renderModal([backing])

    fireEvent.click(screen.getByText(/Repoint to another code/))

    expect(onRepoint).toHaveBeenCalledWith(backing)
  })

  it('changes nothing when dismissed — a missing code may just be out of the file’s scope', () => {
    const { onRetire, onRepoint, onClose } = renderModal([plain, backing])

    fireEvent.click(screen.getByText('Later'))

    expect(onClose).toHaveBeenCalledOnce()
    expect(onRetire).not.toHaveBeenCalled()
    expect(onRepoint).not.toHaveBeenCalled()
  })
})
