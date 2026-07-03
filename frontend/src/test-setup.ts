import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

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
