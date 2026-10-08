import { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { fixedAnchor, parseUtmTable } from './core/polygonExport'
import { mapFlyTo, mapGetZoom } from './test/MapViewStub'

vi.mock('./map/MapView', () => import('./test/MapViewStub'))

vi.mock('react-map-gl/maplibre', () => ({
  Marker: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('./map/PolygonOverlay', () => ({
  default: () => null,
}))

vi.mock('./map/MeasurementOverlay', () => ({
  default: () => null,
}))

const SQUARE = '0,0\n1000,0\n1000,1000\n0,1000\n'

async function choosePolygon(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Toolbox' }))
  await user.click(screen.getByRole('button', { name: 'Polygon' }))
}

function csv(name: string, text: string) {
  return new File([text], name, { type: 'text/csv' })
}

function rowFor(name: string) {
  const rename = screen.getByRole('button', { name: `Rename ${name}` })
  const row = rename.closest('li')
  if (!row) throw new Error(`no row for ${name}`)
  return within(row)
}

describe('App polygon list', () => {
  it('starts with export disabled until a Polygon is imported', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /export snapshot/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Wf schematic, Sfântu Gheorghe' })).toBeInTheDocument()
    expect(screen.getByText('Import a Polygon to export')).toBeInTheDocument()
    expect(screen.getByText('Import a Polygon to place it here at true ground scale.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Re-centre' })).not.toBeInTheDocument()
  })

  it('adds a second file without removing the first', async () => {
    const user = userEvent.setup()
    render(<App />)
    const input = screen.getByLabelText('Choose Polygon file')
    await user.upload(input, csv('field-a.csv', SQUARE))
    await screen.findByRole('button', { name: 'Rename field-a.csv' })
    expect(rowFor('field-a.csv').getByRole('switch', { name: 'Show on map' })).toBeInTheDocument()
    expect(screen.getByText(/Loaded/)).toHaveTextContent('field-a.csv')

    await user.upload(input, csv('field-b.csv', SQUARE))
    await screen.findByRole('button', { name: 'Rename field-b.csv' })
    expect(rowFor('field-b.csv').getByRole('switch', { name: 'Show on map' })).toBeInTheDocument()
    expect(rowFor('field-a.csv').getByRole('switch', { name: 'Show on map' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Re-centre' })).toBeInTheDocument()
    expect(screen.getByLabelText('Colour for field-a.csv')).toHaveValue('#2dd4bf')
    expect(screen.getByLabelText('Colour for field-b.csv')).toHaveValue('#f59e0b')
  })

  it('keeps existing rows when a file cannot be read', async () => {
    const user = userEvent.setup()
    render(<App />)
    const input = screen.getByLabelText('Choose Polygon file')
    await user.upload(input, csv('field-a.csv', SQUARE))
    await screen.findByRole('button', { name: 'Rename field-a.csv' })

    await user.upload(input, csv('bad.csv', 'not coordinates\n'))
    expect(await screen.findByRole('alert')).toHaveTextContent(/try another file/i)
    expect(rowFor('field-a.csv').getByRole('switch', { name: 'Show on map' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rename bad.csv' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Loaded/)).not.toBeInTheDocument()
  })

  it('adds a sample twice and keeps both rows', async () => {
    const user = userEvent.setup()
    render(<App />)
    const sample = screen.getByRole('button', { name: /delta lobe/i })
    await user.click(sample)
    await user.click(sample)
    const rows = await screen.findAllByRole('button', { name: 'Rename sample-delta-lobe.csv' })
    expect(rows).toHaveLength(2)
    for (const rename of rows) {
      const row = rename.closest('li')
      if (!row) throw new Error('no row for sample-delta-lobe.csv')
      expect(within(row).getByRole('switch', { name: 'Show on map' })).toBeInTheDocument()
    }
    expect(sample).not.toHaveAttribute('aria-pressed')
    expect(screen.getByRole('button', { name: 'Re-centre' })).toBeInTheDocument()
  })

  it('shows figures and a single note, and keeps a row when it is switched off', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /small field/i }))
    await screen.findByRole('button', { name: 'Rename sample-small-field.csv' })
    const row = rowFor('sample-small-field.csv')
    expect(screen.queryByText('Planform area')).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Field Polygon preview' })).not.toBeInTheDocument()

    await user.click(row.getByRole('button', { name: 'Show extent' }))
    expect(screen.getByText('Planform area')).toBeInTheDocument()
    expect(screen.getByText('Max span')).toBeInTheDocument()
    expect(screen.getByText('Equivalent square side')).toBeInTheDocument()
    await user.click(row.getByRole('button', { name: 'Show outline' }))
    expect(screen.getByRole('img', { name: 'Field Polygon preview' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Re-centre' })).not.toBeInTheDocument()

    fireEvent.mouseEnter(screen.getByRole('button', { name: /planform area/i }))
    expect(screen.getByText('A = ½ |Σ (xᵢ yᵢ₊₁ − xᵢ₊₁ yᵢ)|')).toBeInTheDocument()

    const sw = row.getByRole('switch', { name: 'Show on map' })
    await user.click(sw)
    expect(sw).toHaveAttribute('aria-checked', 'false')
    expect(row.getByRole('switch', { name: 'Show on map' })).toBeInTheDocument()
    expect(screen.getByText('Switch a Polygon on to show it here.')).toBeInTheDocument()
    expect(screen.getByText('Switch a Polygon on to export')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /export snapshot/i })).toBeDisabled()
  })

  it('hides the three figures and can show them again', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /small field/i }))
    await screen.findByRole('button', { name: 'Rename sample-small-field.csv' })
    const row = rowFor('sample-small-field.csv')
    expect(screen.queryByText('Planform area')).not.toBeInTheDocument()
    await user.click(row.getByRole('button', { name: 'Show extent' }))
    expect(screen.getByText('Planform area')).toBeInTheDocument()
    await user.click(row.getByRole('button', { name: 'Hide extent' }))
    expect(screen.queryByText('Planform area')).not.toBeInTheDocument()
    expect(screen.queryByText('Max span')).not.toBeInTheDocument()
    expect(screen.queryByText('Equivalent square side')).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Field Polygon preview' })).not.toBeInTheDocument()

    await user.click(row.getByRole('button', { name: 'Show extent' }))
    expect(screen.getByText('Planform area')).toBeInTheDocument()
  })

  it('deletes one Polygon and leaves the other', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /delta lobe/i }))
    await user.click(screen.getByRole('button', { name: /small field/i }))
    await screen.findByRole('button', { name: 'Rename sample-small-field.csv' })

    await user.click(screen.getByRole('button', { name: 'Delete sample-delta-lobe.csv' }))
    expect(screen.queryByRole('button', { name: 'Rename sample-delta-lobe.csv' })).not.toBeInTheDocument()
    expect(rowFor('sample-small-field.csv').getByRole('switch', { name: 'Show on map' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Re-centre' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete sample-small-field.csv' }))
    expect(screen.queryByRole('button', { name: 'Rename sample-small-field.csv' })).not.toBeInTheDocument()
    expect(screen.getByText('Import a Polygon to place it here at true ground scale.')).toBeInTheDocument()
  })

  it('keeps a Polygon in the unit it was imported with', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('radio', { name: 'ft' }))
    await user.upload(screen.getByLabelText('Choose Polygon file'), csv('feet.csv', SQUARE))
    await screen.findByRole('button', { name: 'Rename feet.csv' })
    await user.click(rowFor('feet.csv').getByRole('button', { name: 'Show extent' }))
    expect(await screen.findByText('9.3 ha')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'km' }))
    expect(screen.getByText('9.3 ha')).toBeInTheDocument()
    expect(screen.queryByText('1.00 km²')).not.toBeInTheDocument()
  })

  it('keeps measurement figures out of the sidebar until Add to list', async () => {
    const user = userEvent.setup()
    render(<App />)
    await choosePolygon(user)
    await user.click(screen.getByTestId('map'))
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.getByRole('status')).toHaveTextContent('Add at least two corners.')
    expect(screen.queryByText('Planform area')).not.toBeInTheDocument()

    await user.click(screen.getByTestId('map'))
    await user.click(screen.getByTestId('map'))
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.getByText('Segment 1')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.queryByText('Area')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add to list' })).not.toBeInTheDocument()
    expect(screen.queryByText('Planform area')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Toolbox' }))
    expect(screen.getByText('Segment 1')).toBeInTheDocument()
  })

  it('adds a closed measurement to the list and delete leaves an existing row', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /small field/i }))
    await screen.findByRole('button', { name: 'Rename sample-small-field.csv' })

    await choosePolygon(user)
    await user.click(screen.getByTestId('map'))
    await user.click(screen.getByTestId('map'))
    await user.click(screen.getByTestId('map'))
    await user.click(screen.getByTestId('map-double'))
    expect(screen.getByText('Area')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rename Measured Polygon' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add to list' }))
    await screen.findByRole('button', { name: 'Rename Measured Polygon' })
    expect(rowFor('Measured Polygon').getByRole('switch', { name: 'Show on map' })).toBeInTheDocument()
    expect(screen.queryByText('Segment 1')).not.toBeInTheDocument()
    await user.click(rowFor('sample-small-field.csv').getByRole('button', { name: 'Show extent' }))
    await user.click(rowFor('Measured Polygon').getByRole('button', { name: 'Show extent' }))
    expect(screen.getAllByText('Planform area')).toHaveLength(2)
    expect(rowFor('sample-small-field.csv').getByRole('switch', { name: 'Show on map' })).toBeInTheDocument()

    await choosePolygon(user)
    await user.click(screen.getByTestId('map'))
    await user.click(screen.getByTestId('map'))
    await user.click(screen.getByRole('button', { name: 'Done' }))
    await user.click(screen.getByRole('button', { name: 'Delete measurement' }))
    expect(screen.queryByText('Segment 1')).not.toBeInTheDocument()
    expect(rowFor('Measured Polygon').getByRole('switch', { name: 'Show on map' })).toBeInTheDocument()
    expect(rowFor('sample-small-field.csv').getByRole('switch', { name: 'Show on map' })).toBeInTheDocument()
  })

  it('tells the user when the basemap cannot be sampled', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Toolbox' }))
    await user.click(screen.getByRole('button', { name: 'Paint Brush' }))
    expect(screen.getByLabelText('Radius')).toHaveValue(48)
    expect(screen.getByLabelText('Contrast')).toHaveValue(32)
    await user.click(screen.getByTestId('map'))
    expect(await screen.findByRole('status')).toHaveTextContent('This basemap does not allow colour sampling.')
    expect(screen.queryByRole('button', { name: 'Rename Lasso' })).not.toBeInTheDocument()
  })

  it('measures a ruler without adding it to the Polygon list', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Toolbox' }))
    await user.click(screen.getByRole('button', { name: 'Ruler' }))
    await user.click(screen.getByTestId('map'))
    await user.click(screen.getByTestId('map'))
    expect(screen.getByText('Segment 1')).toBeInTheDocument()
    expect(screen.queryByText('Area')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Done' }))
    await user.click(screen.getByTestId('map'))
    expect(screen.getAllByText(/Segment/)).toHaveLength(1)
  })

  it('renames a Polygon and imports a UTM file as a local row plus a fixed twin', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /small field/i }))
    const rename = await screen.findByRole('button', { name: 'Rename sample-small-field.csv' })
    await user.click(rename)
    const field = screen.getByRole('textbox', { name: 'Rename sample-small-field.csv' })
    await user.clear(field)
    await user.type(field, 'Nile field')
    await user.keyboard('{Enter}')
    expect(rowFor('Nile field').getByRole('switch', { name: 'Show on map' })).toBeInTheDocument()

    const utm = [
      '# UTM 36N',
      'Poly,Vert,X,Y,Z',
      '1,1,500000.00,3320000.00,0',
      '1,2,501000.00,3320000.00,0',
      '1,3,501000.00,3321000.00,0',
      '1,4,500000.00,3321000.00,0',
    ].join('\n')
    await user.upload(screen.getByLabelText('Choose Polygon file'), csv('utm-field.csv', utm))
    await screen.findByRole('button', { name: 'Rename utm-field.csv' })
    expect(rowFor('utm-field.csv').getByRole('switch', { name: 'Show on map' })).toBeInTheDocument()
    expect(rowFor('utm-field.csv (fixed)').getByRole('switch', { name: 'Show on map' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export utm-field.csv (fixed)' })).toBeInTheDocument()
    expect(screen.getByRole('complementary').parentElement).toHaveStyle({ '--sidebar-width': '380px' })
  })

  it('flies to the fixed anchor without changing the bearing label', async () => {
    const user = userEvent.setup()
    mapFlyTo.mockClear()
    render(<App />)
    const utm = [
      '# UTM 36N',
      'Poly,Vert,X,Y,Z',
      '1,1,500000.00,3320000.00,0',
      '1,2,501000.00,3320000.00,0',
      '1,3,501000.00,3321000.00,0',
      '1,4,500000.00,3321000.00,0',
    ].join('\n')
    const parsed = parseUtmTable(utm)
    if (!parsed?.zone) throw new Error('expected UTM zone')
    const anchor = fixedAnchor(parsed.parts, parsed.zone)
    await user.upload(screen.getByLabelText('Choose Polygon file'), csv('utm-field.csv', utm))
    const bearing = await screen.findByRole('button', { name: 'Rotation for utm-field.csv' })
    const before = bearing.textContent
    await user.click(screen.getByRole('button', { name: 'Centre on fixed' }))
    expect(bearing.textContent).toBe(before)
    expect(mapFlyTo).toHaveBeenCalledWith(
      expect.objectContaining({
        zoom: 5,
        duration: 1200,
        center: [anchor.lng, anchor.lat],
      }),
    )
    expect(mapGetZoom).toHaveBeenCalled()
  })
})
