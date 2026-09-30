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
  onCentreOnFixed: () => {},
  exportNotes: {},
}

describe('PolygonList bearing', () => {
  it('shows section number 2 in the Polygons heading regardless of row count', () => {
    render(<PolygonList items={[movable()]} {...props} />)
    expect(screen.getByRole('button', { name: 'Polygons' })).toHaveTextContent('2 · Polygons')
  })

  it('shows a bearing field on a movable row and not on a fixed row', () => {
    render(<PolygonList items={[movable(), fixed()]} {...props} />)
    expect(screen.getByRole('button', { name: 'Rotation for Field' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rotation for Field (fixed)' })).not.toBeInTheDocument()
  })

  it('leaves the previous bearing when the typed number is out of range', async () => {
    const user = userEvent.setup()
    const onBearing = vi.fn()
    render(<PolygonList items={[movable()]} {...props} onBearing={onBearing} />)
    await user.click(screen.getByRole('button', { name: 'Rotation for Field' }))
    const field = screen.getByRole('textbox', { name: 'Rotation for Field' })
    await user.clear(field)
    await user.type(field, '360')
    await user.keyboard('{Enter}')
    expect(onBearing).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Rotation for Field' })).toBeInTheDocument()
  })

  it('starts open, hides extent and outline, and puts the name between rotation and the controls', () => {
    render(<PolygonList items={[movable(), fixed()]} {...props} />)
    expect(screen.getByRole('button', { name: 'Polygons' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Polygons' })).toHaveTextContent('2 · Polygons')
    expect(screen.queryByText('Planform area')).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Field Polygon preview' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Show extent' })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'Show outline' })).toHaveLength(2)

    const rotation = screen.getByRole('button', { name: 'Rotation for Field' })
    const name = screen.getByRole('button', { name: 'Rename Field' })
    const sw = screen.getAllByRole('switch', { name: 'Show on map' })[0]
    expect(rotation.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(name.compareDocumentPosition(sw) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('describes Export with the locked tooltip sentence', () => {
    render(<PolygonList items={[movable()]} {...props} />)
    const button = screen.getByRole('button', { name: 'Export Field' })
    const tip = document.getElementById(button.getAttribute('aria-describedby') ?? '')
    expect(tip).toHaveAttribute('role', 'tooltip')
    expect(tip).toHaveTextContent('Download this Polygon as UTM easting and northing where it sits.')
  })
})
