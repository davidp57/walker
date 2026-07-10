import type { ReactNode } from 'react'
import { Logo } from './Logo'
import { IconTracker, IconPeriod, IconCatalog, IconTasks, IconSettings, IconHelp } from './icons'
import { DOCS_SITE_URL } from '../lib/links'

export type Route = 'tracker' | 'period' | 'tasks' | 'codes' | 'settings'

interface NavItem {
  key: Route
  label: string
  icon: ReactNode
}

const NAV: NavItem[] = [
  { key: 'tracker', label: 'Activity', icon: <IconTracker /> },
  { key: 'period', label: 'Timesheet period', icon: <IconPeriod /> },
  { key: 'tasks', label: 'Tasks', icon: <IconTasks /> },
  { key: 'codes', label: 'Code catalog', icon: <IconCatalog /> },
  { key: 'settings', label: 'Settings', icon: <IconSettings /> },
]

/** The account identity shown in the shell footer (CHR-004): just a username and, optionally, a name. */
export interface ShellUser {
  username: string
  name: string | null
}

interface AppShellProps {
  route: Route
  onNavigate: (route: Route) => void
  /** The persistent Timer bar, rendered above every screen. */
  timer: ReactNode
  children: ReactNode
  /**
   * Count of Entries still lacking a Timesheet code (BIZ-010). Shown as a badge on the Activity
   * nav item; hidden at zero so nothing to code reads as a neutral, uncluttered nav.
   */
  uncategorizedCount?: number
  /**
   * Count of tasks that are overdue or due today (excluding done — BIZ-062). Shown as a badge on the
   * Tasks nav item; hidden at zero.
   */
  tasksDueCount?: number
  /** The current user, shown in the footer as `name` if set, else `username`. No role/employer line. */
  user?: ShellUser
}

export function AppShell({
  route,
  onNavigate,
  timer,
  children,
  uncategorizedCount = 0,
  tasksDueCount = 0,
  user,
}: AppShellProps) {
  const displayName = user?.name ?? user?.username ?? ''
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')
  return (
    <div className="wk-app">
      <aside className="wk-sidebar">
        <Logo />
        <nav className="wk-nav" aria-label="Main navigation">
          {NAV.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`wk-nav-item${route === item.key ? ' is-active' : ''}`}
              onClick={() => onNavigate(item.key)}
            >
              <span className="wk-nav-ico">{item.icon}</span>
              <span>{item.label}</span>
              {item.key === 'tracker' && uncategorizedCount > 0 && (
                <span
                  className="wk-nav-badge"
                  data-testid="wk-uncategorized-badge"
                  title={`${uncategorizedCount} entr${uncategorizedCount === 1 ? 'y' : 'ies'} without a Timesheet code`}
                >
                  {uncategorizedCount}
                </span>
              )}
              {item.key === 'tasks' && tasksDueCount > 0 && (
                <span
                  className="wk-nav-badge"
                  data-testid="wk-tasks-due-badge"
                  title={`${tasksDueCount} task${tasksDueCount === 1 ? '' : 's'} overdue or due today`}
                >
                  {tasksDueCount}
                </span>
              )}
            </button>
          ))}
          {/* Global Help link to the docs-site root (BIZ-061): an external link, not a Route — it
              never toggles active state and doesn't call onNavigate. Set apart below the route nav. */}
          <a className="wk-nav-help" href={DOCS_SITE_URL} target="_blank" rel="noopener noreferrer">
            <span className="wk-nav-ico">
              <IconHelp />
            </span>
            <span>Help</span>
          </a>
        </nav>
        {user && (
          <div className="wk-sidebar-foot">
            <div className="wk-avatar">{initials}</div>
            <div className="wk-foot-meta">{displayName}</div>
          </div>
        )}
      </aside>

      <main className="wk-main">
        {timer}
        <div className="wk-outlet">{children}</div>
      </main>

      {/* Phone-portrait replacement for the sidebar (BIZ-033): same NAV, same Route/onNavigate
          contract, shown/hidden purely via the `--wk-bp-phone` media query in walker.css. */}
      <nav className="wk-tabbar" aria-label="Bottom tab bar">
        {NAV.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`wk-tabbar-item${route === item.key ? ' is-active' : ''}`}
            onClick={() => onNavigate(item.key)}
          >
            <span className="wk-tabbar-ico">{item.icon}</span>
            <span className="wk-tabbar-label">{item.label}</span>
            {item.key === 'tracker' && uncategorizedCount > 0 && (
              <span
                className="wk-tabbar-badge"
                data-testid="wk-uncategorized-badge-tabbar"
                title={`${uncategorizedCount} entr${uncategorizedCount === 1 ? 'y' : 'ies'} without a Timesheet code`}
              >
                {uncategorizedCount}
              </span>
            )}
            {item.key === 'tasks' && tasksDueCount > 0 && (
              <span
                className="wk-tabbar-badge"
                data-testid="wk-tasks-due-badge-tabbar"
                title={`${tasksDueCount} task${tasksDueCount === 1 ? '' : 's'} overdue or due today`}
              >
                {tasksDueCount}
              </span>
            )}
          </button>
        ))}
        {/* Help entry point in the phone tab bar too (BIZ-061) — external link, not a Route. */}
        <a
          className="wk-tabbar-help"
          href={DOCS_SITE_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="wk-tabbar-ico">
            <IconHelp />
          </span>
          <span className="wk-tabbar-label">Help</span>
        </a>
      </nav>
    </div>
  )
}
