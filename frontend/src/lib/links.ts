/** Helpers for opening links inside a WYSIWYG editor without breaking editing (BIZ-055). */

/**
 * Root of the published user-facing documentation site (lower-case `/walker/`, see TEC-007).
 * Single source of truth for every in-app link to the docs (BIZ-061): the global Help link and the
 * contextual page links both build from it. Keep the trailing slash so page paths append cleanly.
 */
export const DOCS_SITE_URL = 'https://davidp57.github.io/walker/'

const SAFE_SCHEMES = new Set(['http', 'https', 'mailto'])

/**
 * Return `href` (trimmed) when it carries a safe, openable scheme (`http`/`https`/`mailto`), else
 * `null`. Scheme-less (relative), `javascript:`, `data:`, and empty hrefs are rejected — a link
 * pasted into notes must not be able to execute or resolve to something unexpected.
 */
export function safeExternalHref(href: string): string | null {
  const trimmed = href.trim()
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(trimmed)
  if (!match) return null
  return SAFE_SCHEMES.has(match[1].toLowerCase()) ? trimmed : null
}

/** Whether a mouse event asks to open a link — Cmd on macOS, Ctrl elsewhere (editor convention). */
export function wantsLinkOpen(event: { metaKey: boolean; ctrlKey: boolean }): boolean {
  return event.metaKey || event.ctrlKey
}
