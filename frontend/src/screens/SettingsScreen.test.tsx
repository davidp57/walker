import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SettingsScreen } from './SettingsScreen'
import type { PeriodScheme, Theme } from '../types'

afterEach(() => cleanup())

function renderScreen(overrides: Partial<Parameters<typeof SettingsScreen>[0]> = {}) {
  const props = {
    workdays: [false, true, true, true, true, true, false],
    onToggleWorkday: vi.fn(),
    density: 'comfortable' as const,
    onDensityChange: vi.fn(),
    periodScheme: 'semi_monthly' as PeriodScheme,
    onPeriodSchemeChange: vi.fn(),
    theme: 'system' as Theme,
    onThemeChange: vi.fn(),
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

describe('SettingsScreen — theme control (BIZ-032)', () => {
  it('shows the current theme as active', () => {
    renderScreen({ theme: 'light' })

    expect(screen.getByRole('button', { name: 'Light' })).toHaveClass('is-active')
    expect(screen.getByRole('button', { name: 'Dark' })).not.toHaveClass('is-active')
    expect(screen.getByRole('button', { name: 'System' })).not.toHaveClass('is-active')
  })

  it('defaults to System reading as active when that is the stored preference', () => {
    renderScreen({ theme: 'system' })

    expect(screen.getByRole('button', { name: 'System' })).toHaveClass('is-active')
  })

  it('calls onThemeChange with the picked theme', () => {
    const onThemeChange = vi.fn()
    renderScreen({ onThemeChange })

    fireEvent.click(screen.getByRole('button', { name: 'Dark' }))

    expect(onThemeChange).toHaveBeenCalledWith('dark')
  })

  it('offers Dark, Light, and System and no others', () => {
    renderScreen()

    expect(screen.getByRole('button', { name: 'Dark' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Light' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'System' })).toBeInTheDocument()
  })
})

describe('SettingsScreen — absence range (BIZ-039)', () => {
  it('adds a date range when a "to" date is given', () => {
    const onAddAbsence = vi.fn()
    renderScreen({ onAddAbsence })

    fireEvent.change(screen.getByLabelText('Absence start date'), {
      target: { value: '2026-07-10' },
    })
    fireEvent.change(screen.getByLabelText('Absence end date (optional)'), {
      target: { value: '2026-07-13' },
    })
    fireEvent.change(screen.getByPlaceholderText('Annual leave'), { target: { value: 'Leave' } })
    fireEvent.click(screen.getByText('Add'))

    expect(onAddAbsence).toHaveBeenCalledWith('2026-07-10', 'Leave', '2026-07-13')
  })

  it('adds a single day when no "to" date is given', () => {
    const onAddAbsence = vi.fn()
    renderScreen({ onAddAbsence })

    fireEvent.change(screen.getByLabelText('Absence start date'), {
      target: { value: '2026-07-14' },
    })
    fireEvent.click(screen.getByText('Add'))

    expect(onAddAbsence).toHaveBeenCalledWith('2026-07-14', 'Absence', null)
  })
})
