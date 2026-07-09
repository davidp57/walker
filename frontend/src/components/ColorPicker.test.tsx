import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ColorPicker } from './ColorPicker'
import { PALETTE } from '../lib/palette'

afterEach(() => cleanup())

describe('ColorPicker', () => {
  it('renders all 64 palette swatches plus the analog input', () => {
    render(<ColorPicker value={PALETTE[0]} onChange={vi.fn()} otherCodes={[]} />)
    expect(screen.getAllByRole('radio')).toHaveLength(64)
    expect(screen.getByLabelText('Custom colour')).toBeInTheDocument()
  })

  it('marks the selected swatch as checked', () => {
    render(<ColorPicker value={PALETTE[5]} onChange={vi.fn()} otherCodes={[]} />)
    expect(screen.getByRole('radio', { name: PALETTE[5] })).toBeChecked()
    expect(screen.getByRole('radio', { name: PALETTE[6] })).not.toBeChecked()
  })

  it('names the code(s) using a colour and keeps that swatch selectable', () => {
    const onChange = vi.fn()
    render(
      <ColorPicker
        value={PALETTE[0]}
        onChange={onChange}
        otherCodes={[{ color: PALETTE[10], name: 'Paper V4' }]}
      />,
    )
    const used = screen.getByRole('radio', { name: `${PALETTE[10]} — used by Paper V4` })
    fireEvent.click(used)
    expect(onChange).toHaveBeenCalledWith(PALETTE[10])
  })

  it('re-rolls a colour from the least-used set on 🎲', () => {
    const onChange = vi.fn()
    // Every colour but the last is taken → the only least-used (count 0) colour is the last one.
    const otherCodes = PALETTE.slice(0, 63).map((color, i) => ({ color, name: `c${i}` }))
    render(<ColorPicker value={PALETTE[0]} onChange={onChange} otherCodes={otherCodes} />)
    fireEvent.click(screen.getByRole('button', { name: 'Suggest another colour' }))
    expect(onChange).toHaveBeenCalledWith(PALETTE[63])
  })

  it('passes an arbitrary hex through the analog input', () => {
    const onChange = vi.fn()
    render(<ColorPicker value={PALETTE[0]} onChange={onChange} otherCodes={[]} />)
    fireEvent.input(screen.getByLabelText('Custom colour'), { target: { value: '#123456' } })
    expect(onChange).toHaveBeenCalledWith('#123456')
  })
})
