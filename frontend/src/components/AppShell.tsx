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
  { key: 'tracker', label: 'Today', icon: <IconTracker /> },
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
}

export function AppShell({ route, onNavigate, timer, children }: AppShellProps) {
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
