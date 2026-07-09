import { useMemo } from 'react'
import { PALETTE, isPaletteColor, suggestColor } from '../lib/palette'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  // The other codes whose colours to avoid + mark as "used" (the edited code itself is excluded by
  // the caller so its own colour reads as *selected*, not *taken*). BIZ-048.
  otherCodes: { color: string; name: string }[]
}

/**
 * Rich colour picker (BIZ-048): a 🎲 re-roll of the least-used-first suggestion, a hue-ordered grid
 * of the 64 palette swatches (used ones carry a corner marker + a tooltip naming the code(s), yet
 * stay selectable), and the native analog `<input type="color">` for any arbitrary hex.
 */
export function ColorPicker({ value, onChange, otherCodes }: ColorPickerProps) {
  // Palette colour (lower-cased) -> names of the codes using it. Palette-only: an off-palette colour
  // lights no swatch.
  const usedNames = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const c of otherCodes) {
      const key = c.color.trim().toLowerCase()
      if (!isPaletteColor(key)) continue
      const names = map.get(key) ?? []
      names.push(c.name)
      map.set(key, names)
    }
    return map
  }, [otherCodes])

  const selected = value.trim().toLowerCase()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          className="wk-btn-ghost"
          title="Suggest another colour"
          aria-label="Suggest another colour"
          onClick={() => onChange(suggestColor(otherCodes.map((c) => c.color)))}
        >
          🎲 Suggest
        </button>
        <label
          className="wk-screen-sub"
          style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
        >
          Custom
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label="Custom colour"
            style={{
              width: 34,
              height: 28,
              padding: 0,
              background: 'none',
              border: '1px solid var(--wk-line)',
              borderRadius: 'var(--wk-radius-md)',
              cursor: 'pointer',
            }}
          />
        </label>
      </div>

      <div
        role="radiogroup"
        aria-label="Palette colours"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}
      >
        {PALETTE.map((color) => {
          const names = usedNames.get(color)
          const isSelected = color === selected
          const title = names ? `Used by ${names.join(', ')}` : color
          return (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={names ? `${color} — used by ${names.join(', ')}` : color}
              title={title}
              onClick={() => onChange(color)}
              style={{
                position: 'relative',
                aspectRatio: '1',
                minHeight: 22,
                background: color,
                border: 'none',
                borderRadius: 'var(--wk-radius-md)',
                cursor: 'pointer',
                outline: isSelected ? '2px solid var(--wk-fg)' : '1px solid var(--wk-line)',
                outlineOffset: isSelected ? 2 : 0,
              }}
            >
              {names && (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 3,
                    fontSize: 10,
                    lineHeight: 1,
                    color: '#0009',
                    fontWeight: 700,
                  }}
                >
                  ●
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
