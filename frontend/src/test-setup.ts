import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// jsdom doesn't implement `matchMedia` — App.tsx calls it to resolve the theme preference
// (BIZ-032). Default to "prefers light" so unrelated tests that mount App don't throw; tests that
// specifically exercise theme resolution stub this themselves with the matches value they need.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

// This Node/jsdom combination defers `localStorage` to an experimental Node flag
// (`--localstorage-file`) that this project doesn't set, so `window.localStorage` is `undefined` in
// tests even though it's a normal browser global. `lib/theme.ts` caches the resolved theme there for
// a flash-free first paint (BIZ-032) — a minimal in-memory polyfill keeps its tests exercising the
// same interface a real browser exposes, instead of the source code special-casing test environments.
if (typeof window !== 'undefined' && !window.localStorage) {
  const store = new Map<string, string>()
  window.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size
    },
  } as Storage
}

// Testing Library's auto-cleanup relies on a global `afterEach`, which this project doesn't enable
// (no `test.globals` in vitest.config.ts) — register it explicitly so each test starts with a fresh DOM.
afterEach(() => {
  cleanup()
})

// jsdom doesn't implement layout, so `Range`/`Element` expose no client rects. ProseMirror (which
// powers the Milkdown-based Task description editor, BIZ-024) calls these to scroll the caret into
// view on every edit; without a stub it throws. This is a documented jsdom gap, not app behaviour.
if (typeof document !== 'undefined') {
  const zeroRect: DOMRect = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    toJSON: () => ({}),
  }
  const emptyRectList = (): DOMRectList =>
    Object.assign([] as DOMRect[], {
      item: () => null,
    }) as unknown as DOMRectList
  document.createRange = () => {
    const range = new Range()
    range.getBoundingClientRect = () => zeroRect
    range.getClientRects = emptyRectList
    return range
  }
  if (!Element.prototype.getClientRects) {
    Element.prototype.getClientRects = emptyRectList
  }
  if (!document.elementFromPoint) {
    document.elementFromPoint = () => null
  }
}
