import { useEffect } from 'react'

/**
 * Run `handler` when Escape is pressed — the native "get me out of here" for a modal (BIZ-059 keeps
 * outside-click disabled, but Escape is a deliberate keypress, not an accidental dismissal). Pass
 * `enabled: false` to suspend it while a nested picker owns Escape. The latest `handler` is always
 * used, so callers can branch on current state (e.g. cancel an inline confirm before closing).
 */
export function useEscapeToClose(handler: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        handler()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [handler, enabled])
}
