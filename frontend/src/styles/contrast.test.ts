import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Read the actual tokens.css source from disk, so assertions run against the real
// values instead of a hand-copied duplicate that could silently drift.
const tokensCss = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), 'tokens.css'),
  'utf-8',
)

/**
 * WCAG 2.x relative luminance / contrast ratio helpers.
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function srgbChannelToLinear(channel: number): number {
  const c = channel / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function relativeLuminance(hex: string): number {
  const clean = hex.replace('#', '')
  const r = Number.parseInt(clean.slice(0, 2), 16)
  const g = Number.parseInt(clean.slice(2, 4), 16)
  const b = Number.parseInt(clean.slice(4, 6), 16)
  return (
    0.2126 * srgbChannelToLinear(r) +
    0.7152 * srgbChannelToLinear(g) +
    0.0722 * srgbChannelToLinear(b)
  )
}

function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexA)
  const lumB = relativeLuminance(hexB)
  const lighter = Math.max(lumA, lumB)
  const darker = Math.min(lumA, lumB)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Extract `--token: #hex;` values straight from tokens.css's dark-theme `:root { ... }` block only
 * (the source of truth for the tests below) — scoped so a later `:root[data-theme="light"]` block
 * reusing the same token names (BIZ-032) can never shadow these dark values.
 */
function readTokens(): Record<string, string> {
  const tokens: Record<string, string> = {}
  const rootBlock = /:root\s*\{([^}]*)\}/.exec(tokensCss)?.[1] ?? ''
  const re = /(--wk-[a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g
  let match: RegExpExecArray | null
  while ((match = re.exec(rootBlock)) !== null) {
    tokens[match[1]] = match[2]
  }
  return tokens
}

const WCAG_AA_NORMAL_TEXT = 4.5

describe('dark-theme token contrast (WCAG AA)', () => {
  const tokens = readTokens()

  it('parses the expected surface and text tokens from tokens.css', () => {
    expect(tokens['--wk-bg-0']).toBeDefined()
    expect(tokens['--wk-bg-1']).toBeDefined()
    expect(tokens['--wk-bg-2']).toBeDefined()
    expect(tokens['--wk-text-lo']).toBeDefined()
  })

  // --wk-text-lo backs most meta / totals-label / column-header text (see walker.css).
  // It must clear 4.5:1 (WCAG AA, normal text) against every surface it is rendered on.
  const surfacesUnderTextLo = ['--wk-bg-0', '--wk-bg-1', '--wk-bg-2', '--wk-weekend']

  it.each(surfacesUnderTextLo)('text-lo on %s meets WCAG AA (>=4.5:1)', (bgToken) => {
    const ratio = contrastRatio(tokens['--wk-text-lo'], tokens[bgToken])
    expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT)
  })

  // Regression guard: text-mid and text-hi (already-passing tokens) must stay above AA too.
  const readableTextTokens = ['--wk-text-mid', '--wk-text', '--wk-text-hi']
  const mainSurfaces = ['--wk-bg-0', '--wk-bg-1', '--wk-bg-2']

  for (const textToken of readableTextTokens) {
    it.each(mainSurfaces)(`${textToken} on %s meets WCAG AA (>=4.5:1)`, (bgToken) => {
      const ratio = contrastRatio(tokens[textToken], tokens[bgToken])
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT)
    })
  }
})

describe('functional text minimum size', () => {
  function readFontSizeTokens(): Record<string, number> {
    const sizes: Record<string, number> = {}
    const re = /(--wk-fs-\d+):\s*([\d.]+)px/g
    let match: RegExpExecArray | null
    while ((match = re.exec(tokensCss)) !== null) {
      sizes[match[1]] = Number.parseFloat(match[2])
    }
    return sizes
  }

  const FUNCTIONAL_TEXT_FLOOR_PX = 11

  it('every font-size token used for functional text (headers, totals, meta) is >= 11px', () => {
    const sizes = readFontSizeTokens()
    // --wk-fs-9 and --wk-fs-10 back column headers (.wk-entry-head, .wk-grid-rowhead-h),
    // totals labels (.wk-total-h, .wk-daytotal-label) and meta (.wk-foot-meta, .wk-timer-since).
    for (const token of ['--wk-fs-9', '--wk-fs-10', '--wk-fs-11']) {
      expect(sizes[token]).toBeGreaterThanOrEqual(FUNCTIONAL_TEXT_FLOOR_PX)
    }
  })
})
