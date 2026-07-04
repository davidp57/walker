// Context/hook plumbing for the toast system, split out of toast.tsx so that file only exports
// components (keeps React Fast Refresh happy).
import { createContext, useContext } from 'react'

export interface ToastContextValue {
  /** Surface a visible, dismissible error toast. Stacks — an earlier error is never bumped out. */
  notifyError: (message: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

/** Report failed saves/loads as a visible toast. Must be used within a `ToastProvider`. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}

/** Render a caught API error into a user-facing message. */
export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? `${fallback} — ${err.message}` : fallback
}
