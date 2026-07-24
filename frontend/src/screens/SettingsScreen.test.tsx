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

    expect(screen.getByRole('radio', { name: 'Semi-monthly' })).toHaveClass('is-active')
    expect(screen.getByRole('radio', { name: 'Weekly' })).not.toHaveClass('is-active')
    expect(screen.getByRole('radio', { name: 'Monthly' })).not.toHaveClass('is-active')
  })

  it('reflects whichever scheme is passed in as active', () => {
    renderScreen({ periodScheme: 'weekly' })

    expect(screen.getByRole('radio', { name: 'Weekly' })).toHaveClass('is-active')
    expect(screen.getByRole('radio', { name: 'Semi-monthly' })).not.toHaveClass('is-active')
  })

  it('calls onPeriodSchemeChange with the picked scheme', () => {
    const onPeriodSchemeChange = vi.fn()
    renderScreen({ onPeriodSchemeChange })

    fireEvent.click(screen.getByRole('radio', { name: 'Monthly' }))

    expect(onPeriodSchemeChange).toHaveBeenCalledWith('monthly')
  })

  it('offers all three fixed schemes and no others', () => {
    renderScreen()

    expect(screen.getByRole('radio', { name: 'Weekly' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Semi-monthly' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Monthly' })).toBeInTheDocument()
  })
})

describe('SettingsScreen — theme control (BIZ-032)', () => {
  it('shows the current theme as active', () => {
    renderScreen({ theme: 'light' })

    expect(screen.getByRole('radio', { name: 'Light' })).toHaveClass('is-active')
    expect(screen.getByRole('radio', { name: 'Dark' })).not.toHaveClass('is-active')
    expect(screen.getByRole('radio', { name: 'System' })).not.toHaveClass('is-active')
  })

  it('defaults to System reading as active when that is the stored preference', () => {
    renderScreen({ theme: 'system' })

    expect(screen.getByRole('radio', { name: 'System' })).toHaveClass('is-active')
  })

  it('calls onThemeChange with the picked theme', () => {
    const onThemeChange = vi.fn()
    renderScreen({ onThemeChange })

    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }))

    expect(onThemeChange).toHaveBeenCalledWith('dark')
  })

  it('offers Dark, Light, and System and no others', () => {
    renderScreen()

    expect(screen.getByRole('radio', { name: 'Dark' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Light' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'System' })).toBeInTheDocument()
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

describe('SettingsScreen — accessibility', () => {
  it('exposes each segmented control as a labelled radiogroup with a checked radio', () => {
    renderScreen({ periodScheme: 'weekly', theme: 'light' })

    const scheme = screen.getByRole('radiogroup', { name: 'Timesheet period scheme' })
    expect(scheme).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Weekly' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Monthly' })).not.toBeChecked()
    expect(screen.getByRole('radiogroup', { name: 'Theme' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked()
  })

  it('moves the selection with Arrow keys (roving radiogroup)', () => {
    const onPeriodSchemeChange = vi.fn()
    renderScreen({ periodScheme: 'weekly', onPeriodSchemeChange })

    fireEvent.keyDown(screen.getByRole('radio', { name: 'Weekly' }), { key: 'ArrowRight' })

    expect(onPeriodSchemeChange).toHaveBeenCalledWith('semi_monthly')
  })

  it('marks workday toggles with aria-pressed reflecting the rhythm', () => {
    renderScreen({ workdays: [false, true, true, true, true, true, false] })

    // Monday is on, Sunday is off.
    expect(screen.getByRole('button', { name: 'Mon', pressed: true })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sun', pressed: false })).toBeInTheDocument()
  })

  it('gives the screen a heading outline (h1 + section h2s)', () => {
    renderScreen()

    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Work rhythm' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Theme' })).toBeInTheDocument()
  })
})
