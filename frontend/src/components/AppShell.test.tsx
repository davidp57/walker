import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppShell } from './AppShell'

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
