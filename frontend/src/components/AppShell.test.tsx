import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from './AppShell'

afterEach(() => cleanup())

describe('AppShell — nav', () => {
  it('has exactly four nav items and no "Enter in T&E" destination', () => {
    render(
      <AppShell route="tracker" onNavigate={vi.fn()} timer={null}>
        <div />
      </AppShell>,
    )

    const nav = screen.getByRole('navigation')
    const items = nav.querySelectorAll('.wk-nav-item')
    expect(items).toHaveLength(4)
    expect(screen.queryByText('Enter in T&E')).not.toBeInTheDocument()
  })
})
