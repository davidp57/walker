// Shared, minimal toast system for surfacing failed API calls (TEC-002). Walker is a tool of
// record: a save or load that fails must never revert or vanish silently — it must be visible so
// the user can retry.
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { ToastContext } from './toastContext'

type ToastVariant = 'error' | 'info'

interface Toast {
  id: number
  message: string
  variant: ToastVariant
}

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((message: string, variant: ToastVariant) => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, message, variant }])
  }, [])

  const notifyError = useCallback((message: string) => push(message, 'error'), [push])
  const notify = useCallback((message: string) => push(message, 'info'), [push])

  const value = useMemo(() => ({ notifyError, notify }), [notifyError, notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.length > 0 && (
        <div className="wk-toast-stack">
          {toasts.map((t) => (
            <div
              key={t.id}
              // Errors demand attention (assertive `alert`); info notices are polite (`status`).
              role={t.variant === 'error' ? 'alert' : 'status'}
              className={`wk-toast wk-toast-${t.variant}`}
            >
              <span className="wk-toast-msg">{t.message}</span>
              <button
                type="button"
                className="wk-toast-dismiss"
                aria-label="Dismiss"
                onClick={() => dismiss(t.id)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}
