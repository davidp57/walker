import { cleanup, render, screen, within } from '@testing-library/react'
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

    const nav = screen.getByRole('navigation', { name: /main navigation/i })
    const items = nav.querySelectorAll('.wk-nav-item')
    expect(items).toHaveLength(5)
    expect(nav).toHaveTextContent('Tasks')
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
    const nav = screen.getByRole('navigation', { name: /main navigation/i })
    expect(nav).toHaveTextContent('Activity')
  })
})

describe('AppShell — footer display name (CHR-004)', () => {
  it('shows the user name when set', () => {
    render(
      <AppShell
        route="tracker"
        onNavigate={() => {}}
        timer={null}
        user={{ username: 'jdoe', name: 'Jane Doe' }}
      >
        <div />
      </AppShell>,
    )
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
  })

  it('falls back to the username when no name is set', () => {
    render(
      <AppShell
        route="tracker"
        onNavigate={() => {}}
        timer={null}
        user={{ username: 'jdoe', name: null }}
      >
        <div />
      </AppShell>,
    )
    expect(screen.getByText('jdoe')).toBeInTheDocument()
  })

  it('renders no PwC or role/employer text', () => {
    render(
      <AppShell
        route="tracker"
        onNavigate={() => {}}
        timer={null}
        user={{ username: 'jdoe', name: null }}
      >
        <div />
      </AppShell>,
    )
    expect(screen.queryByText(/PwC/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Consultant/)).not.toBeInTheDocument()
  })
})

describe('AppShell — bottom tab bar (BIZ-033)', () => {
  it('renders a bottom tab bar with the same five sections as the sidebar', () => {
    render(
      <AppShell route="tracker" onNavigate={() => {}} timer={null}>
        <div />
      </AppShell>,
    )

    const tabbar = screen.getByRole('navigation', { name: /bottom tab bar/i })
    const items = tabbar.querySelectorAll('.wk-tabbar-item')
    expect(items).toHaveLength(5)
    expect(tabbar).toHaveTextContent('Activity')
    expect(tabbar).toHaveTextContent('Timesheet period')
    expect(tabbar).toHaveTextContent('Tasks')
    expect(tabbar).toHaveTextContent('Code catalog')
    expect(tabbar).toHaveTextContent('Settings')
  })

  it('calls onNavigate with the right route when a tab is tapped', () => {
    const onNavigate = vi.fn()
    render(
      <AppShell route="tracker" onNavigate={onNavigate} timer={null}>
        <div />
      </AppShell>,
    )

    const tabbar = screen.getByRole('navigation', { name: /bottom tab bar/i })
    const tasksTab = Array.from(tabbar.querySelectorAll('.wk-tabbar-item')).find((el) =>
      el.textContent?.includes('Tasks'),
    )
    expect(tasksTab).toBeDefined()
    tasksTab!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onNavigate).toHaveBeenCalledWith('tasks')
  })

  it('visually distinguishes the active tab', () => {
    render(
      <AppShell route="period" onNavigate={() => {}} timer={null}>
        <div />
      </AppShell>,
    )

    const tabbar = screen.getByRole('navigation', { name: /bottom tab bar/i })
    const activeTab = Array.from(tabbar.querySelectorAll('.wk-tabbar-item')).find((el) =>
      el.textContent?.includes('Timesheet period'),
    )
    expect(activeTab).toHaveClass('is-active')
  })

  it('shows the uncategorized-Entry badge on the Activity tab too (BIZ-010)', () => {
    render(
      <AppShell route="tracker" onNavigate={() => {}} timer={null} uncategorizedCount={2}>
        <div />
      </AppShell>,
    )

    const tabbar = screen.getByRole('navigation', { name: /bottom tab bar/i })
    const activityTab = Array.from(tabbar.querySelectorAll('.wk-tabbar-item')).find((el) =>
      el.textContent?.includes('Activity'),
    )
    expect(activityTab).toHaveTextContent('2')
  })
})

describe('AppShell — Help link to the docs site (BIZ-061)', () => {
  const DOCS_ROOT = 'https://davidp57.github.io/walker/'

  it('shows a Help link to the docs-site root in the sidebar, opening in a new tab', () => {
    render(
      <AppShell route="tracker" onNavigate={vi.fn()} timer={null}>
        <div />
      </AppShell>,
    )
    const nav = screen.getByRole('navigation', { name: /main navigation/i })
    const help = within(nav).getByRole('link', { name: /help/i })
    expect(help).toHaveAttribute('href', DOCS_ROOT)
    expect(help).toHaveAttribute('target', '_blank')
    expect(help).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('shows a Help link to the docs-site root in the bottom tab bar too', () => {
    render(
      <AppShell route="tracker" onNavigate={vi.fn()} timer={null}>
        <div />
      </AppShell>,
    )
    const tabbar = screen.getByRole('navigation', { name: /bottom tab bar/i })
    const help = within(tabbar).getByRole('link', { name: /help/i })
    expect(help).toHaveAttribute('href', DOCS_ROOT)
    expect(help).toHaveAttribute('target', '_blank')
    expect(help).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('does not fire onNavigate when Help is clicked, and never shows the active state', () => {
    const onNavigate = vi.fn()
    render(
      <AppShell route="tracker" onNavigate={onNavigate} timer={null}>
        <div />
      </AppShell>,
    )
    const help = within(screen.getByRole('navigation', { name: /main navigation/i })).getByRole(
      'link',
      { name: /help/i },
    )
    help.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onNavigate).not.toHaveBeenCalled()
    expect(help).not.toHaveClass('is-active')
  })

  it('keeps Help out of the five route items (it is not a screen)', () => {
    render(
      <AppShell route="tracker" onNavigate={vi.fn()} timer={null}>
        <div />
      </AppShell>,
    )
    const nav = screen.getByRole('navigation', { name: /main navigation/i })
    expect(nav.querySelectorAll('.wk-nav-item')).toHaveLength(5)
    const tabbar = screen.getByRole('navigation', { name: /bottom tab bar/i })
    expect(tabbar.querySelectorAll('.wk-tabbar-item')).toHaveLength(5)
  })
})

describe('AppShell — uncategorized-Entry count (BIZ-010)', () => {
  it('shows the count next to the Activity nav item when there are uncategorized Entries', () => {
    render(
      <AppShell route="tracker" onNavigate={() => {}} timer={null} uncategorizedCount={3}>
        <div />
      </AppShell>,
    )

    const nav = screen.getByRole('navigation', { name: /main navigation/i })
    const activity = within(nav).getByText('Activity').closest('button')
    expect(activity).not.toBeNull()
    expect(activity).toHaveTextContent('3')
  })

  it('hides the count when there are no uncategorized Entries', () => {
    render(
      <AppShell route="tracker" onNavigate={() => {}} timer={null} uncategorizedCount={0}>
        <div />
      </AppShell>,
    )

    const nav = screen.getByRole('navigation', { name: /main navigation/i })
    const activity = within(nav).getByText('Activity').closest('button')
    expect(activity).not.toBeNull()
    expect(screen.queryByTestId('wk-uncategorized-badge')).not.toBeInTheDocument()
  })
})
