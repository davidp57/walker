import { describe, expect, it } from 'vitest'
import { planSwitchLayout, SWITCH_BLOCK_WIDTH, TIMER_INPUT_MIN_WIDTH } from './switchLayout'

const plan = (barWidth: number, reservedWidth: number, maxBlocks = 4) =>
  planSwitchLayout({ barWidth, reservedWidth, maxBlocks })

describe('planSwitchLayout', () => {
  it('shows every block when the bar is wide enough for them and the description', () => {
    const wide = 1000 + TIMER_INPUT_MIN_WIDTH + 4 * SWITCH_BLOCK_WIDTH
    expect(plan(wide, 1000)).toEqual({ blocks: 4, stacked: false })
  })

  it('drops blocks rather than the description while some still fit', () => {
    const room = 1000 + TIMER_INPUT_MIN_WIDTH + 2 * SWITCH_BLOCK_WIDTH + 10
    expect(plan(room, 1000)).toEqual({ blocks: 2, stacked: false })
  })

  it('stacks the description onto its own line once no block fits beside it', () => {
    // Enough for two blocks, but not for two blocks *and* a usable description field.
    const room = 1000 + 2 * SWITCH_BLOCK_WIDTH
    expect(plan(room, 1000)).toEqual({ blocks: 2, stacked: true })
  })

  it('keeps the description inline when stacking would not buy a single block', () => {
    expect(plan(1000 + SWITCH_BLOCK_WIDTH - 1, 1000)).toEqual({ blocks: 0, stacked: false })
  })

  it('never exceeds the requested cap, however wide the bar', () => {
    expect(plan(6000, 1000, 3)).toEqual({ blocks: 3, stacked: false })
  })

  it('asks for nothing when the band is switched off', () => {
    expect(plan(6000, 1000, 0)).toEqual({ blocks: 0, stacked: false })
  })

  it('shows nothing before the bar has been measured', () => {
    expect(plan(0, 0, 4)).toEqual({ blocks: 0, stacked: false })
  })
})
