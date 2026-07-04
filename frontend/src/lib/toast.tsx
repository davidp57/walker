// Shared, minimal toast system for surfacing failed API calls (TEC-002). Walker is a tool of
// record: a save or load that fails must never revert or vanish silently — it must be visible so
// the user can retry.
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { ToastContext } from './toastContext'

interface Toast {
  id: number
  message: string
}

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const notifyError = useCallback((message: string) => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, message }])
  }, [])

  const value = useMemo(() => ({ notifyError }), [notifyError])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.length > 0 && (
        <div className="wk-toast-stack">
          {toasts.map((t) => (
            <div key={t.id} role="alert" className="wk-toast wk-toast-error">
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
