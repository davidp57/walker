import { describe, expect, it } from 'vitest'
import { safeExternalHref, wantsLinkOpen } from './links'

describe('safeExternalHref', () => {
  it('accepts http, https and mailto', () => {
    expect(safeExternalHref('https://example.com')).toBe('https://example.com')
    expect(safeExternalHref('http://example.com/x?y=1')).toBe('http://example.com/x?y=1')
    expect(safeExternalHref('mailto:foo@bar.com')).toBe('mailto:foo@bar.com')
  })

  it('is case-insensitive on the scheme', () => {
    expect(safeExternalHref('HTTPS://example.com')).toBe('HTTPS://example.com')
  })

  it('rejects javascript:, data:, and other unsafe schemes', () => {
    expect(safeExternalHref('javascript:alert(1)')).toBeNull()
    expect(safeExternalHref('data:text/html,<script>')).toBeNull()
    expect(safeExternalHref('file:///etc/passwd')).toBeNull()
  })

  it('rejects empty, whitespace, and scheme-less (relative) hrefs', () => {
    expect(safeExternalHref('')).toBeNull()
    expect(safeExternalHref('   ')).toBeNull()
    expect(safeExternalHref('/relative/path')).toBeNull()
    expect(safeExternalHref('example.com')).toBeNull()
    expect(safeExternalHref('#anchor')).toBeNull()
  })

  it('trims surrounding whitespace', () => {
    expect(safeExternalHref('  https://example.com  ')).toBe('https://example.com')
  })
})

describe('wantsLinkOpen', () => {
  it('is true when Cmd (meta) or Ctrl is held', () => {
    expect(wantsLinkOpen({ metaKey: true, ctrlKey: false })).toBe(true)
    expect(wantsLinkOpen({ metaKey: false, ctrlKey: true })).toBe(true)
  })

  it('is false with no modifier', () => {
    expect(wantsLinkOpen({ metaKey: false, ctrlKey: false })).toBe(false)
  })
})
