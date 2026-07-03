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
      <TimerBar {...baseProps} description="writing spec" onSubmitDescription={onSubmitDescription} />,
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
