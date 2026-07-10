import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ToastProvider } from './toast'
import { useToast } from './toastContext'

afterEach(() => cleanup())

function Trigger({ message }: { message: string }) {
  const { notifyError } = useToast()
  return (
    <button type="button" onClick={() => notifyError(message)}>
      trigger
    </button>
  )
}

describe('ToastProvider / useToast', () => {
  it('renders nothing when no error has been reported', () => {
    render(
      <ToastProvider>
        <div>content</div>
      </ToastProvider>,
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('surfaces a visible alert when notifyError is called', () => {
    render(
      <ToastProvider>
        <Trigger message="Could not save your changes." />
      </ToastProvider>,
    )

    fireEvent.click(screen.getByText('trigger'))

    expect(screen.getByRole('alert')).toHaveTextContent('Could not save your changes.')
  })

  it('lets the user dismiss a toast', () => {
    render(
      <ToastProvider>
        <Trigger message="Failed to load entries." />
      </ToastProvider>,
    )

    fireEvent.click(screen.getByText('trigger'))
    expect(screen.getByRole('alert')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('stacks multiple errors so an earlier one is not silently lost', () => {
    render(
      <ToastProvider>
        <Trigger message="First failure." />
      </ToastProvider>,
    )

    fireEvent.click(screen.getByText('trigger'))
    fireEvent.click(screen.getByText('trigger'))

    expect(screen.getAllByRole('alert')).toHaveLength(2)
  })
})

function InfoTrigger({ message }: { message: string }) {
  const { notify } = useToast()
  return (
    <button type="button" onClick={() => notify(message)}>
      info
    </button>
  )
}

describe('ToastProvider — info toasts (BIZ-062)', () => {
  it('notify() shows a dismissible info toast, styled distinctly from an error toast', () => {
    render(
      <ToastProvider>
        <InfoTrigger message="3 tasks due today" />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByText('info'))

    const toast = screen.getByText('3 tasks due today').closest('.wk-toast')
    expect(toast).toHaveClass('wk-toast-info')
    expect(toast).not.toHaveClass('wk-toast-error')

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(screen.queryByText('3 tasks due today')).not.toBeInTheDocument()
  })

  it('keeps error toasts styled as errors', () => {
    render(
      <ToastProvider>
        <Trigger message="save failed" />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByText('trigger'))
    expect(screen.getByText('save failed').closest('.wk-toast')).toHaveClass('wk-toast-error')
  })
})
