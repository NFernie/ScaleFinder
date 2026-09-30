import { fireEvent, render, screen } from '@testing-library/react'
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

describe('PolygonList centre on fixed', () => {
  it('hides Centre on fixed until a fixed polygon and a switched-on movable polygon both exist', () => {
    const { rerender } = render(<PolygonList items={[movable()]} {...props} />)
    expect(screen.queryByRole('button', { name: 'Centre on fixed' })).not.toBeInTheDocument()
    rerender(<PolygonList items={[movable(), fixed()]} {...props} />)
    expect(screen.getByRole('button', { name: 'Centre on fixed' })).toBeInTheDocument()
  })

  it('calls the fixed id immediately when only one fixed polygon exists', async () => {
    const user = userEvent.setup()
    const onCentreOnFixed = vi.fn()
    render(<PolygonList items={[movable(), fixed()]} {...props} onCentreOnFixed={onCentreOnFixed} />)
    await user.click(screen.getByRole('button', { name: 'Centre on fixed' }))
    expect(onCentreOnFixed).toHaveBeenCalledWith('b')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('opens a name list for several fixed polygons and ignores Escape', async () => {
    const user = userEvent.setup()
    const onCentreOnFixed = vi.fn()
    const other = { ...fixed(), id: 'c', sourceName: 'Other (fixed)' }
    render(
      <PolygonList items={[movable(), fixed(), other]} {...props} onCentreOnFixed={onCentreOnFixed} />,
    )
    await user.click(screen.getByRole('button', { name: 'Centre on fixed' }))
    expect(onCentreOnFixed).not.toHaveBeenCalled()
    await user.keyboard('{Escape}')
    expect(onCentreOnFixed).not.toHaveBeenCalled()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Centre on fixed' }))
    await user.click(screen.getByRole('option', { name: 'Other (fixed)' }))
    expect(onCentreOnFixed).toHaveBeenCalledWith('c')
  })

  it('closes the fixed list on a pointer down outside', async () => {
    const onCentreOnFixed = vi.fn()
    const other = { ...fixed(), id: 'c', sourceName: 'Other (fixed)' }
    render(<PolygonList items={[movable(), fixed(), other]} {...props} onCentreOnFixed={onCentreOnFixed} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Centre on fixed' }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onCentreOnFixed).not.toHaveBeenCalled()
  })

  it('closes the picker and hides Centre on fixed when the last movable is switched off', async () => {
    const user = userEvent.setup()
    const other = { ...fixed(), id: 'c', sourceName: 'Other (fixed)' }
    const on = [movable(), fixed(), other]
    const { rerender } = render(<PolygonList items={on} {...props} />)
    await user.click(screen.getByRole('button', { name: 'Centre on fixed' }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    const off = [{ ...movable(), selected: false }, fixed(), other]
    rerender(<PolygonList items={off} {...props} />)
    expect(screen.queryByRole('button', { name: 'Centre on fixed' })).not.toBeInTheDocument()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

    rerender(<PolygonList items={on} {...props} />)
    expect(screen.getByRole('button', { name: 'Centre on fixed' })).toBeInTheDocument()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('closes the picker when the section heading is clicked while it is open', async () => {
    const user = userEvent.setup()
    const other = { ...fixed(), id: 'c', sourceName: 'Other (fixed)' }
    render(<PolygonList items={[movable(), fixed(), other]} {...props} />)
    await user.click(screen.getByRole('button', { name: 'Centre on fixed' }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Polygons' }))
    expect(screen.getByRole('button', { name: 'Polygons' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Centre on fixed' })).toBeInTheDocument()
  })

  it('opens the picker when a fixed name is empty and a row has many parts', async () => {
    const user = userEvent.setup()
    const manyParts = Array.from({ length: 24 }, (_, i) => [
      { x: i * 10, y: 0 },
      { x: i * 10 + 8, y: 0 },
      { x: i * 10 + 8, y: 8 },
      { x: i * 10, y: 8 },
    ])
    const unnamed = { ...fixed(), sourceName: '' }
    const other = { ...fixed(), id: 'c', sourceName: 'Other (fixed)', raw: manyParts.flat() }
    render(<PolygonList items={[{ ...movable(), sourceName: '' }, unnamed, other]} {...props} />)
    await user.click(screen.getByRole('button', { name: 'Centre on fixed' }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Other (fixed)' })).toBeInTheDocument()
  })
})
