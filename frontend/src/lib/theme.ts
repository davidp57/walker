import type { Theme } from '../types'

/** The two actual rendered themes `resolveTheme` can return. */
export type ResolvedTheme = 'dark' | 'light'

/**
 * Resolve a theme preference to an actual dark/light value — mirrors
 * `services/settings.py::resolve_theme` exactly. `"system"` defers to `prefersDark` (the browser's
 * `matchMedia('(prefers-color-scheme: dark)').matches`); `"dark"`/`"light"` always win outright.
 * Pure function, no DOM access, so it's unit-testable on its own.
 */
export function resolveTheme(preference: Theme, prefersDark: boolean): ResolvedTheme {
  if (preference === 'system') return prefersDark ? 'dark' : 'light'
  return preference
}

// The server (`GET /api/settings`) is the source of truth for the theme preference, but it's only
// reachable after the SPA has already mounted — waiting for it would flash the default (dark)
// `:root` palette on every cold load for anyone on light/system-light. This tiny localStorage cache
// exists purely to paint the *previous* known-good resolved theme immediately, before React or the
// settings fetch even run; the real preference (loaded moments later) always overwrites it.
const RESOLVED_CACHE_KEY = 'wk-last-resolved-theme'
// A second cache, of the raw *preference* (not the resolved value) — App.tsx seeds its `theme` state
// from this instead of a hardcoded `"system"`. Without it, the first render's theme-applying effect
// would run with the "system" default before `fetchSettings` resolves, and could briefly resolve to
// the wrong value (e.g. a User who explicitly chose "light" but whose OS reports "prefers dark") and
// clobber the correct value `main.tsx` already painted from `RESOLVED_CACHE_KEY`.
const PREFERENCE_CACHE_KEY = 'wk-last-theme-preference'

/** Best-effort read of the last resolved theme painted, for a flash-free first paint. */
export function readCachedResolvedTheme(): ResolvedTheme | null {
  try {
    const value = window.localStorage.getItem(RESOLVED_CACHE_KEY)
    return value === 'dark' || value === 'light' ? value : null
  } catch {
    return null // storage disabled/unavailable (e.g. private browsing) — no cache, no crash
  }
}

/** Best-effort read of the last theme *preference* loaded from the server. */
export function readCachedThemePreference(): Theme | null {
  try {
    const value = window.localStorage.getItem(PREFERENCE_CACHE_KEY)
    return value === 'dark' || value === 'light' || value === 'system' ? value : null
  } catch {
    return null
  }
}

/** Best-effort write-through of the resolved theme, so the next cold load can paint it immediately. */
export function writeCachedResolvedTheme(theme: ResolvedTheme): void {
  try {
    window.localStorage.setItem(RESOLVED_CACHE_KEY, theme)
  } catch {
    // storage disabled/unavailable — nothing to fall back to, and nothing worth surfacing to the user
  }
}

/** Best-effort write-through of the theme preference, so the next cold load's first effect run
 * already resolves correctly, before the settings fetch completes. */
export function writeCachedThemePreference(preference: Theme): void {
  try {
    window.localStorage.setItem(PREFERENCE_CACHE_KEY, preference)
  } catch {
    // storage disabled/unavailable — nothing worth surfacing to the user
  }
}

/** Apply a resolved theme to the document and cache it for the next cold load's first paint. */
export function applyResolvedTheme(theme: ResolvedTheme): void {
  document.documentElement.dataset.theme = theme
  writeCachedResolvedTheme(theme)
}
