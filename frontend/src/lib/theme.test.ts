import { afterEach, describe, expect, it } from 'vitest'
import {
  applyResolvedTheme,
  readCachedResolvedTheme,
  readCachedThemePreference,
  resolveTheme,
  writeCachedThemePreference,
} from './theme'

describe('resolveTheme', () => {
  it('resolves "system" to "dark" when the OS prefers dark', () => {
    expect(resolveTheme('system', true)).toBe('dark')
  })

  it('resolves "system" to "light" when the OS prefers light', () => {
    expect(resolveTheme('system', false)).toBe('light')
  })

  it('"dark" always wins outright, regardless of the OS preference', () => {
    expect(resolveTheme('dark', true)).toBe('dark')
    expect(resolveTheme('dark', false)).toBe('dark')
  })

  it('"light" always wins outright, regardless of the OS preference', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('light', false)).toBe('light')
  })
})

describe('theme cache (flash-free first paint)', () => {
  afterEach(() => {
    window.localStorage.clear()
    delete document.documentElement.dataset.theme
  })

  it('reads back null when nothing has been cached yet', () => {
    expect(readCachedResolvedTheme()).toBeNull()
  })

  it('applyResolvedTheme sets the dataset attribute and caches the value', () => {
    applyResolvedTheme('light')

    expect(document.documentElement.dataset.theme).toBe('light')
    expect(readCachedResolvedTheme()).toBe('light')
  })

  it('a later applyResolvedTheme call overwrites the cache', () => {
    applyResolvedTheme('dark')
    applyResolvedTheme('light')

    expect(readCachedResolvedTheme()).toBe('light')
  })

  it('ignores a corrupt/unexpected cached value', () => {
    window.localStorage.setItem('wk-last-resolved-theme', 'sepia')

    expect(readCachedResolvedTheme()).toBeNull()
  })
})

describe('theme preference cache (avoids clobbering the flash-free paint before settings load)', () => {
  afterEach(() => {
    window.localStorage.clear()
  })

  it('reads back null when nothing has been cached yet', () => {
    expect(readCachedThemePreference()).toBeNull()
  })

  it('round-trips each valid preference, including "system"', () => {
    writeCachedThemePreference('light')
    expect(readCachedThemePreference()).toBe('light')

    writeCachedThemePreference('dark')
    expect(readCachedThemePreference()).toBe('dark')

    writeCachedThemePreference('system')
    expect(readCachedThemePreference()).toBe('system')
  })

  it('ignores a corrupt/unexpected cached value', () => {
    window.localStorage.setItem('wk-last-theme-preference', 'sepia')

    expect(readCachedThemePreference()).toBeNull()
  })
})
