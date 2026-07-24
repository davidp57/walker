/**
 * A two-step delete guard rendered in place: a short prompt plus Keep / confirm buttons. Deletions
 * in Walker have no undo, so a destructive control arms this instead of firing straight through. The
 * confirm button takes focus, so Enter confirms and Escape (handled by the host) cancels.
 */
export function InlineDeleteConfirm({
  prompt = 'Delete this?',
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
  testid,
  confirmStyle,
}: {
  prompt?: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  testid: string
  confirmStyle?: React.CSSProperties
}) {
  return (
    <span className="wk-delete-confirm" role="group" aria-label="Confirm deletion">
      <span className="wk-delete-confirm-label">{prompt}</span>
      <button
        type="button"
        className="wk-btn-ghost"
        onClick={onCancel}
        data-testid={`${testid}-cancel`}
      >
        Keep
      </button>
      <button
        type="button"
        className="wk-btn wk-btn-danger"
        style={confirmStyle}
        onClick={onConfirm}
        data-testid={`${testid}-confirm`}
        autoFocus
      >
        {confirmLabel}
      </button>
    </span>
  )
}
