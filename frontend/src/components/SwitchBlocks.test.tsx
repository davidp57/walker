import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SwitchBlocks } from './SwitchBlocks'
import type { SwitchTarget } from '../types'

const paper: SwitchTarget = {
  codeId: '1',
  codeNumber: 'N9/1042',
  codeName: 'Paper V4',
  color: '#3b82f6',
  activity: 'Implementation',
  activities: ['Implementation', 'Management'],
}

const chatbot: SwitchTarget = {
  codeId: '2',
  codeNumber: 'N9/2001',
  codeName: 'Ask HR ChatBot',
  color: '#f59e0b',
  activity: 'Mnt',
  activities: ['Mnt'],
}

describe('SwitchBlocks (BIZ-093)', () => {
  it('shows one block per code, labelled by the code name alone', () => {
    render(<SwitchBlocks targets={[paper, chatbot]} onPick={() => {}} />)

    expect(screen.getByText('Paper V4')).toBeInTheDocument()
    expect(screen.getByText('Ask HR ChatBot')).toBeInTheDocument()
    // The activity lives in the menu, never on the face of the block.
    expect(screen.queryByText('Implementation')).not.toBeInTheDocument()
  })

  it('a plain click switches onto the block’s default activity', () => {
    const onPick = vi.fn()
    render(<SwitchBlocks targets={[paper]} onPick={onPick} />)

    fireEvent.click(screen.getByRole('button', { name: /Paper V4/ }))

    expect(onPick).toHaveBeenCalledWith(paper, 'Implementation')
  })

  it('hovering a multi-activity block offers its other activities', () => {
    const onPick = vi.fn()
    render(<SwitchBlocks targets={[paper]} onPick={onPick} />)

    fireEvent.mouseEnter(screen.getByTestId('switch-block-1'))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Management' }))

    expect(onPick).toHaveBeenCalledWith(paper, 'Management')
  })

  it('offers no menu for a code with a single activity', () => {
    render(<SwitchBlocks targets={[chatbot]} onPick={() => {}} />)

    fireEvent.mouseEnter(screen.getByTestId('switch-block-2'))

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('opens the menu on keyboard focus, so a block is usable without a mouse', () => {
    render(<SwitchBlocks targets={[paper]} onPick={() => {}} />)

    fireEvent.focus(screen.getByRole('button', { name: /Paper V4/ }))

    expect(screen.getByRole('menuitem', { name: 'Management' })).toBeInTheDocument()
  })

  it('renders nothing at all when there is no target', () => {
    const { container } = render(<SwitchBlocks targets={[]} onPick={() => {}} />)

    expect(container).toBeEmptyDOMElement()
  })
})
