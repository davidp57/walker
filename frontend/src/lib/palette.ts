/**
 * Curated code-colour palette + least-used-first suggestion (BIZ-048).
 *
 * Single source of truth on the frontend, mirrored on the backend in
 * `walker/services/palette.py`; a contract test on each side asserts both equal the shared fixture
 * `tests/fixtures/palette.json` (same pattern as `resolveTheme`/`resolve_theme`), so a change to one
 * that isn't mirrored fails a test instead of silently diverging.
 *
 * Display order is by hue — an 8×8 grid reads as a spectrum. Ordering is presentational only; there
 * are no colour "families". Every colour sits at a mid lightness so it stays legible in both themes.
 */

// prettier-ignore
export const PALETTE: string[] = [
  '#d65151', '#dc756a', '#d66a51', '#dc8a6a', '#d68351', '#dca06a', '#d69c51', '#dcb56a',
  '#d0ab39', '#d6c251', '#d0c739', '#d2d651', '#bed039', '#b9d651', '#a1d039', '#a0d651',
  '#94d651', '#99dc6a', '#7bd651', '#83dc6a', '#62d651', '#6edc6a', '#51d65a', '#6adc7c',
  '#39d05f', '#51d67f', '#39d07b', '#51d698', '#39d098', '#51d6b1', '#39d0b4', '#51d6ca',
  '#51d6d6', '#6ad1dc', '#51bdd6', '#6abcdc', '#51a5d6', '#6aa7dc', '#518cd6', '#6a91dc',
  '#395fd0', '#5166d6', '#3942d0', '#5651d6', '#4c39d0', '#6f51d6', '#6839d0', '#8751d6',
  '#9451d6', '#ae6adc', '#ad51d6', '#c36adc', '#c651d6', '#d96adc', '#d651ce', '#dc6aca',
  '#d039ab', '#d651a9', '#d0398e', '#d65190', '#d03972', '#d65177', '#d03955', '#d6515e',
]

const PALETTE_SET = new Set(PALETTE)

/** Whether a colour is one of the 64 palette colours (case-insensitive). */
export function isPaletteColor(color: string): boolean {
  return PALETTE_SET.has(color.trim().toLowerCase())
}

/**
 * The palette colours with the minimal usage count across `used`, in palette order.
 *
 * Counting is **palette-only**: a colour in `used` outside the 64 (a legacy hex or an arbitrary
 * analog pick) is ignored and lights no swatch. While free colours remain the minimum is 0 (avoid
 * already-chosen); once every colour is used it degrades to 1, then 2, … — one rule unifying
 * avoidance and graceful saturation.
 */
export function leastUsedColors(used: Iterable<string>): string[] {
  const counts = new Map<string, number>()
  for (const raw of used) {
    const c = raw.trim().toLowerCase()
    if (PALETTE_SET.has(c)) counts.set(c, (counts.get(c) ?? 0) + 1)
  }
  let minimum = Infinity
  for (const c of PALETTE) minimum = Math.min(minimum, counts.get(c) ?? 0)
  return PALETTE.filter((c) => (counts.get(c) ?? 0) === minimum)
}

/** Pick a colour uniformly at random among the least-used palette colours (BIZ-048). */
export function suggestColor(used: Iterable<string>): string {
  const candidates = leastUsedColors(used)
  return candidates[Math.floor(Math.random() * candidates.length)]
}
