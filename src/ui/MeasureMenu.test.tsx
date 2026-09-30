import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { addCorner, applyDoubleClick, beginMeasurement } from '../core/measurement'
import MeasureMenu from './MeasureMenu'
import { VERTEX_EDIT_HINT } from './ToolboxTooltips'

const a = { lng: 10, lat: 45 }
const b = { lng: 10.01, lat: 45 }
const c = { lng: 10.01, lat: 45.01 }

describe('MeasureMenu', () => {
  it('shows the vertex hint only after the polygon is closed', () => {
    const open = addCorner(addCorner(beginMeasurement(), a), b)
    const { rerender } = render(
      <MeasureMenu measurement={open} onDone={vi.fn()} onDelete={vi.fn()} onAdd={vi.fn()} />,
    )
    expect(screen.queryByText(VERTEX_EDIT_HINT)).not.toBeInTheDocument()
    const closed = applyDoubleClick(addCorner(open, c), c)
    if (!closed) throw new Error('expected closed')
    rerender(<MeasureMenu measurement={closed} onDone={vi.fn()} onDelete={vi.fn()} onAdd={vi.fn()} />)
    expect(screen.getByText(VERTEX_EDIT_HINT)).toBeInTheDocument()
  })
})
