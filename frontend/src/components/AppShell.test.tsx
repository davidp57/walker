import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { AppShell } from './AppShell'

afterEach(() => {
  cleanup()
})

describe('AppShell — uncategorized-Entry count (BIZ-010)', () => {
  it('shows the count next to the Today nav item when there are uncategorized Entries', () => {
    render(
      <AppShell route="tracker" onNavigate={() => {}} timer={null} uncategorizedCount={3}>
        <div />
      </AppShell>,
    )

    const today = screen.getByText('Today').closest('button')
    expect(today).not.toBeNull()
    expect(today).toHaveTextContent('3')
  })

  it('hides the count when there are no uncategorized Entries', () => {
    render(
      <AppShell route="tracker" onNavigate={() => {}} timer={null} uncategorizedCount={0}>
        <div />
      </AppShell>,
    )

    const today = screen.getByText('Today').closest('button')
    expect(today).not.toBeNull()
    expect(screen.queryByTestId('wk-uncategorized-badge')).not.toBeInTheDocument()
  })
})
