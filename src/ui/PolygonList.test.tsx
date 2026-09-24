import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { PolygonItem } from '../core/polygonList'
import { rotationState } from '../core/rotation'
import PolygonList from './PolygonList'

const square = [
  { x: 0, y: 0 },
  { x: 1000, y: 0 },
  { x: 1000, y: 1000 },
  { x: 0, y: 1000 },
]

function movable(): PolygonItem {
  const anchor = { lng: 31, lat: 30 }
  const state = rotationState([square], anchor)
  return {
    id: 'a',
    sourceName: 'Field',
    raw: square,
    unit: 'm',
    hasZ: false,
    selected: true,
    anchor,
    colour: '#2dd4bf',
    ...state,
  }
}

function fixed(): PolygonItem {
  return {
    id: 'b',
    sourceName: 'Field (fixed)',
    raw: square,
    unit: 'm',
    hasZ: false,
    selected: true,
    anchor: { lng: 31, lat: 30 },
    colour: '#f59e0b',
    fixed: true,
  }
}

const props = {
  onToggle: () => {},
  onColourChange: () => {},
  onReCentre: () => {},
  onDelete: () => {},
  onRename: () => {},
  onBearing: () => {},
  onExport: () => {},
  onExportSelected: () => {},
  exportNotes: {},
}

describe('PolygonList bearing', () => {
  it('shows a bearing field on a movable row and not on a fixed row', () => {
    render(<PolygonList items={[movable(), fixed()]} {...props} />)
    expect(screen.getByRole('button', { name: 'Bearing for Field' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Bearing for Field (fixed)' })).not.toBeInTheDocument()
  })

  it('leaves the previous bearing when the typed number is out of range', async () => {
    const user = userEvent.setup()
    const onBearing = vi.fn()
    render(<PolygonList items={[movable()]} {...props} onBearing={onBearing} />)
    await user.click(screen.getByRole('button', { name: 'Bearing for Field' }))
    const field = screen.getByRole('textbox', { name: 'Bearing for Field' })
    await user.clear(field)
    await user.type(field, '360')
    await user.keyboard('{Enter}')
    expect(onBearing).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Bearing for Field' })).toBeInTheDocument()
  })
})
