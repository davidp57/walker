import type { ReactNode } from 'react'
import { Logo } from './Logo'
import { IconTracker, IconFortnight, IconCatalog, IconSettings } from './icons'

export type Route = 'tracker' | 'fortnight' | 'codes' | 'settings'

interface NavItem {
  key: Route
  label: string
  icon: ReactNode
}

const NAV: NavItem[] = [
  { key: 'tracker', label: 'Activity', icon: <IconTracker /> },
  { key: 'fortnight', label: 'Fortnight', icon: <IconFortnight /> },
  { key: 'codes', label: 'Code catalog', icon: <IconCatalog /> },
  { key: 'settings', label: 'Settings', icon: <IconSettings /> },
]

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
}

export function AppShell({
  route,
  onNavigate,
  timer,
  children,
  uncategorizedCount = 0,
}: AppShellProps) {
  return (
    <div className="wk-app">
      <aside className="wk-sidebar">
        <Logo />
        <nav className="wk-nav">
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
            </button>
          ))}
        </nav>
        <div className="wk-sidebar-foot">
          <div className="wk-avatar">JD</div>
          <div className="wk-foot-meta">
            Consultant
            <br />
            PwC &middot; Advisory
          </div>
        </div>
      </aside>

      <main className="wk-main">
        {timer}
        <div className="wk-outlet">{children}</div>
      </main>
    </div>
  )
}
