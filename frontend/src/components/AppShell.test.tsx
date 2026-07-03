import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { AppShell } from './AppShell'

afterEach(() => {
  cleanup()
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

  it('labels the Checklist destination "Enter into T&E", matching its screen title', () => {
    render(
      <AppShell route="checklist" onNavigate={() => {}} timer={null}>
        <div />
      </AppShell>,
    )
    expect(screen.getByText('Enter into T&E')).toBeInTheDocument()
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
