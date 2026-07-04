import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TimerBar } from './TimerBar'

// Minimal required props for a stopped, uncategorized timer bar.
const baseProps = {
  running: false,
  elapsedSeconds: 0,
  description: '',
  code: null,
  activity: null,
  suggestions: [],
  onDescriptionChange: () => {},
  onStart: () => {},
  onStop: () => {},
  onCancel: () => {},
  onSwitchTask: () => {},
  onPickSuggestion: () => {},
}

describe('TimerBar — Enter-to-start (BIZ-009)', () => {
  it('pressing Enter in the description field starts a Timer carrying that description', () => {
    const onSubmitDescription = vi.fn()
    render(
      <TimerBar
        {...baseProps}
        description="writing spec"
        onSubmitDescription={onSubmitDescription}
      />,
    )

    const input = screen.getByPlaceholderText('What are you working on?')
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onSubmitDescription).toHaveBeenCalledTimes(1)
  })

  it('the capture-first empty Start still works with no input (button, no Enter)', () => {
    const onStart = vi.fn()
    const onSubmitDescription = vi.fn()
    render(<TimerBar {...baseProps} onStart={onStart} onSubmitDescription={onSubmitDescription} />)

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))

    expect(onStart).toHaveBeenCalledTimes(1)
    expect(onSubmitDescription).not.toHaveBeenCalled()
  })

  it('does not start again on Enter while already running (avoids double-start)', () => {
    const onSubmitDescription = vi.fn()
    render(
      <TimerBar
        {...baseProps}
        running
        description="writing spec"
        onSubmitDescription={onSubmitDescription}
      />,
    )

    const input = screen.getByPlaceholderText('What are you working on?')
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onSubmitDescription).not.toHaveBeenCalled()
  })

  it('ignores other keys', () => {
    const onSubmitDescription = vi.fn()
    render(<TimerBar {...baseProps} onSubmitDescription={onSubmitDescription} />)

    const input = screen.getByPlaceholderText('What are you working on?')
    fireEvent.keyDown(input, { key: 'a' })

    expect(onSubmitDescription).not.toHaveBeenCalled()
  })
})

describe('TimerBar — Stop | Complete split (BIZ-023)', () => {
  it('shows a plain Stop button when the running entry has no linked task', () => {
    render(<TimerBar {...baseProps} running taskId={null} onComplete={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Complete' })).not.toBeInTheDocument()
  })

  it('shows Stop and Complete when the running entry is linked to a task', () => {
    render(<TimerBar {...baseProps} running taskId="5" onComplete={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Complete' })).toBeInTheDocument()
  })

  it('calls onStop (not onComplete) when Stop is clicked', () => {
    const onStop = vi.fn()
    const onComplete = vi.fn()
    render(<TimerBar {...baseProps} running taskId="5" onStop={onStop} onComplete={onComplete} />)

    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))

    expect(onStop).toHaveBeenCalledTimes(1)
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('calls onComplete (not onStop) when Complete is clicked', () => {
    const onStop = vi.fn()
    const onComplete = vi.fn()
    render(<TimerBar {...baseProps} running taskId="5" onStop={onStop} onComplete={onComplete} />)

    fireEvent.click(screen.getByRole('button', { name: 'Complete' }))

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onStop).not.toHaveBeenCalled()
  })

  it('does not show Complete while stopped, even with a linked task from the last run', () => {
    render(<TimerBar {...baseProps} running={false} taskId="5" onComplete={vi.fn()} />)

    expect(screen.queryByRole('button', { name: 'Complete' })).not.toBeInTheDocument()
  })
})
