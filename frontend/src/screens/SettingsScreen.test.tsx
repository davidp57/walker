import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SettingsScreen } from './SettingsScreen'
import type { PeriodScheme } from '../types'

afterEach(() => cleanup())

function renderScreen(overrides: Partial<Parameters<typeof SettingsScreen>[0]> = {}) {
  const props = {
    workdays: [false, true, true, true, true, true, false],
    onToggleWorkday: vi.fn(),
    density: 'comfortable' as const,
    onDensityChange: vi.fn(),
    periodScheme: 'semi_monthly' as PeriodScheme,
    onPeriodSchemeChange: vi.fn(),
    absences: [],
    onAddAbsence: vi.fn(),
    onRemoveAbsence: vi.fn(),
    ...overrides,
  }
  render(<SettingsScreen {...props} />)
  return props
}

describe('SettingsScreen — Timesheet period scheme control (BIZ-027)', () => {
  it('shows semi-monthly as active by default', () => {
    renderScreen()

    expect(screen.getByRole('button', { name: 'Semi-monthly' })).toHaveClass('is-active')
    expect(screen.getByRole('button', { name: 'Weekly' })).not.toHaveClass('is-active')
    expect(screen.getByRole('button', { name: 'Monthly' })).not.toHaveClass('is-active')
  })

  it('reflects whichever scheme is passed in as active', () => {
    renderScreen({ periodScheme: 'weekly' })

    expect(screen.getByRole('button', { name: 'Weekly' })).toHaveClass('is-active')
    expect(screen.getByRole('button', { name: 'Semi-monthly' })).not.toHaveClass('is-active')
  })

  it('calls onPeriodSchemeChange with the picked scheme', () => {
    const onPeriodSchemeChange = vi.fn()
    renderScreen({ onPeriodSchemeChange })

    fireEvent.click(screen.getByRole('button', { name: 'Monthly' }))

    expect(onPeriodSchemeChange).toHaveBeenCalledWith('monthly')
  })

  it('offers all three fixed schemes and no others', () => {
    renderScreen()

    expect(screen.getByRole('button', { name: 'Weekly' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Semi-monthly' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Monthly' })).toBeInTheDocument()
  })
})
