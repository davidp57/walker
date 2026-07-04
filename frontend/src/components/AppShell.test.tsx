import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from './AppShell'

afterEach(() => cleanup())

describe('AppShell — nav', () => {
  it('has exactly five nav items (incl. Tasks — BIZ-021) and no "Enter in Timesheet system" destination', () => {
    render(
      <AppShell route="tracker" onNavigate={vi.fn()} timer={null}>
        <div />
      </AppShell>,
    )

    const nav = screen.getByRole('navigation')
    const items = nav.querySelectorAll('.wk-nav-item')
    expect(items).toHaveLength(5)
    expect(screen.getByText('Tasks')).toBeInTheDocument()
    expect(screen.queryByText('Enter in Timesheet system')).not.toBeInTheDocument()
    expect(screen.queryByText('Enter into Timesheet system')).not.toBeInTheDocument()
  })
})

describe('AppShell — nav label consistency', () => {
  it('labels the Tracker destination "Activity", matching its screen title', () => {
    render(
      <AppShell route="tracker" onNavigate={() => {}} timer={null}>
        <div />
      </AppShell>,
    )
    expect(screen.getByText('Activity')).toBeInTheDocument()
  })
})

describe('AppShell — uncategorized-Entry count (BIZ-010)', () => {
  it('shows the count next to the Activity nav item when there are uncategorized Entries', () => {
    render(
      <AppShell route="tracker" onNavigate={() => {}} timer={null} uncategorizedCount={3}>
        <div />
      </AppShell>,
    )

    const activity = screen.getByText('Activity').closest('button')
    expect(activity).not.toBeNull()
    expect(activity).toHaveTextContent('3')
  })

  it('hides the count when there are no uncategorized Entries', () => {
    render(
      <AppShell route="tracker" onNavigate={() => {}} timer={null} uncategorizedCount={0}>
        <div />
      </AppShell>,
    )

    const activity = screen.getByText('Activity').closest('button')
    expect(activity).not.toBeNull()
    expect(screen.queryByTestId('wk-uncategorized-badge')).not.toBeInTheDocument()
  })
})
