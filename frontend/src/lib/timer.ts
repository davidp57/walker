/** Timer categorization rules (capture-first — ADR-0006). */

/** The running timer as far as the categorization decision is concerned. */
export interface RunningTimer {
  codeId: string | null
  description: string
}

/**
 * Should applying a task to the running timer re-tag it *in place* rather than splitting it?
 *
 * A capture-first **stub** — a running entry with no code and no description — is time the user
 * captured before saying what it was. Categorizing it must attribute that elapsed time to the
 * picked task in place. Splitting (closing it and opening a new segment) would orphan the
 * pre-categorization minutes as a phantom uncategorized entry. Split only when the running entry
 * is real work (already categorized, or carrying a description) — that's a genuine task change.
 */
export function shouldRetagInPlace(running: RunningTimer | null): boolean {
  return running !== null && !running.codeId && running.description.trim() === ''
}
