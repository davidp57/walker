/**
 * How many Switch blocks fit on the Timer bar, and whether the description field must move down
 * (BIZ-093, ADR-0016).
 *
 * The bar's contents are ranked by what may be sacrificed first. The Timer chip, clock and buttons
 * are untouchable — they are the running Timer itself. Blocks come next: the preference is a *cap*,
 * and a narrow window simply shows fewer of them. The description field is what yields first: rather
 * than being crushed to its CSS floor, it drops onto a line of its own so the blocks stay clickable.
 *
 * Pure on purpose — the measuring belongs to the component, the arithmetic is testable here.
 */

/** Width budgeted for one block: a colour dot plus a truncating code name. */
export const SWITCH_BLOCK_WIDTH = 168

/** Below this the description field stops being a field you can type a sentence into. */
export const TIMER_INPUT_MIN_WIDTH = 260

export interface SwitchLayoutInput {
  /** Measured width of the whole Timer bar, in pixels. `0` before the first measurement. */
  barWidth: number
  /** Measured width of everything that never yields: the chip, the clock, and the buttons. */
  reservedWidth: number
  /** The user's `switch_count` preference — the most blocks that may ever show. */
  maxBlocks: number
}

export interface SwitchLayout {
  blocks: number
  /** Whether the description field takes a line of its own below the rest of the bar. */
  stacked: boolean
}

const fit = (budget: number, maxBlocks: number): number =>
  Math.max(0, Math.min(maxBlocks, Math.floor(budget / SWITCH_BLOCK_WIDTH)))

/** Decide how many blocks to render and whether the description field stacks below. */
export function planSwitchLayout({
  barWidth,
  reservedWidth,
  maxBlocks,
}: SwitchLayoutInput): SwitchLayout {
  if (maxBlocks <= 0 || barWidth <= 0) return { blocks: 0, stacked: false }

  const available = barWidth - reservedWidth
  const inline = fit(available - TIMER_INPUT_MIN_WIDTH, maxBlocks)
  if (inline > 0) return { blocks: inline, stacked: false }

  // No block fits beside the description — stacking is only worth the extra row if it buys one.
  const stacked = fit(available, maxBlocks)
  return stacked > 0 ? { blocks: stacked, stacked: true } : { blocks: 0, stacked: false }
}
