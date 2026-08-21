import { useEffect, useState } from 'react'
import { isoDate } from './time'

/** How often the civil day is re-checked while the app stays open. */
const TICK_MS = 30_000

/**
 * The current civil day as an ISO `"YYYY-MM-DD"`, kept alive (BIZ-091).
 *
 * Walker used to read "today" once, at module evaluation. An app left open across midnight then
 * believed it was still yesterday: the loaded entries window stopped covering the real today, the
 * `Today` / `Yesterday` group labels were off by one, a per-day `+ Add` filed entries under the wrong
 * date — and, worst, nothing could notice that the running Timer now belonged to a *past* day, which
 * is exactly the situation that silently destroyed a tracked day.
 *
 * Polling is deliberate rather than a timeout scheduled for midnight: a laptop that suspends over the
 * rollover fires no such timeout, and the same tick covers a system clock corrected by hand. The
 * focus / visibility listeners make the update immediate on the far more common path — coming back to
 * a tab left open overnight.
 */
export function useToday(): string {
  const [today, setToday] = useState<string>(() => isoDate(new Date()))

  useEffect(() => {
    // Compare inside the setter: identical values keep the same reference, so no re-render.
    const check = () =>
      setToday((current) => (isoDate(new Date()) === current ? current : isoDate(new Date())))
    const interval = window.setInterval(check, TICK_MS)
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])

  return today
}
