import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

vi.mock('./map/MapView', () => import('./test/MapViewStub'))

vi.mock('./map/PolygonOverlay', () => ({
  default: () => null,
}))

vi.mock('./map/MeasurementOverlay', () => ({
  default: () => null,
}))

const SQUARE = '0,0\n1000,0\n1000,1000\n0,1000\n'

function csv(name: string, text: string) {
  return new File([text], name, { type: 'text/csv' })
}

describe('App polygon list', () => {
  it('starts with export disabled until a Polygon is imported', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /export snapshot/i })).toBeDisabled()
    expect(screen.getByText('Import a Polygon to export')).toBeInTheDocument()
    expect(screen.getByText('Import a Polygon to place it here at true ground scale.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Re-centre' })).not.toBeInTheDocument()
  })

  it('adds a second file without removing the first', async () => {
    const user = userEvent.setup()
    render(<App />)
    const input = screen.getByLabelText('Choose Polygon file')
    await user.upload(input, csv('field-a.csv', SQUARE))
    expect(await screen.findByRole('switch', { name: 'field-a.csv' })).toBeInTheDocument()
    expect(screen.getByText(/Loaded/)).toHaveTextContent('field-a.csv')

    await user.upload(input, csv('field-b.csv', SQUARE))
    expect(await screen.findByRole('switch', { name: 'field-b.csv' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'field-a.csv' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Re-centre' })).toBeInTheDocument()
    expect(screen.getByLabelText('Colour for field-a.csv')).toHaveValue('#2dd4bf')
    expect(screen.getByLabelText('Colour for field-b.csv')).toHaveValue('#f59e0b')
  })

  it('keeps existing rows when a file cannot be read', async () => {
    const user = userEvent.setup()
    render(<App />)
    const input = screen.getByLabelText('Choose Polygon file')
    await user.upload(input, csv('field-a.csv', SQUARE))
    await screen.findByRole('switch', { name: 'field-a.csv' })

    await user.upload(input, csv('bad.csv', 'not coordinates\n'))
    expect(await screen.findByRole('alert')).toHaveTextContent(/try another file/i)
    expect(screen.getByRole('switch', { name: 'field-a.csv' })).toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: 'bad.csv' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Loaded/)).not.toBeInTheDocument()
  })

  it('adds a sample twice and keeps both rows', async () => {
    const user = userEvent.setup()
    render(<App />)
    const sample = screen.getByRole('button', { name: /delta lobe/i })
    await user.click(sample)
    await user.click(sample)
    const rows = await screen.findAllByRole('switch', { name: 'sample-delta-lobe.csv' })
    expect(rows).toHaveLength(2)
    expect(sample).not.toHaveAttribute('aria-pressed')
    expect(screen.getByRole('button', { name: 'Re-centre' })).toBeInTheDocument()
  })

  it('shows figures and a single note, and keeps a row when it is switched off', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /small field/i }))
    const row = await screen.findByRole('switch', { name: 'sample-small-field.csv' })
    expect(screen.getByText('Planform area')).toBeInTheDocument()
    expect(screen.getByText('Max span')).toBeInTheDocument()
    expect(screen.getByText('Equivalent square side')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Field Polygon preview' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Re-centre' })).not.toBeInTheDocument()

    fireEvent.mouseEnter(screen.getByRole('button', { name: /planform area/i }))
    expect(screen.getByRole('tooltip')).toHaveTextContent('A = ½ |Σ (xᵢ yᵢ₊₁ − xᵢ₊₁ yᵢ)|')

    await user.click(row)
    expect(row).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('switch', { name: 'sample-small-field.csv' })).toBeInTheDocument()
    expect(screen.getByText('Switch a Polygon on to show it here.')).toBeInTheDocument()
    expect(screen.getByText('Switch a Polygon on to export')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /export snapshot/i })).toBeDisabled()
  })

  it('hides the three figures and can show them again', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /small field/i }))
    await screen.findByText('Planform area')
    await user.click(screen.getByRole('button', { name: 'Hide figures' }))
    expect(screen.queryByText('Planform area')).not.toBeInTheDocument()
    expect(screen.queryByText('Max span')).not.toBeInTheDocument()
    expect(screen.queryByText('Equivalent square side')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Field Polygon preview' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show figures' }))
    expect(screen.getByText('Planform area')).toBeInTheDocument()
  })

  it('deletes one Polygon and leaves the other', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /delta lobe/i }))
    await user.click(screen.getByRole('button', { name: /small field/i }))
    await screen.findByRole('switch', { name: 'sample-small-field.csv' })

    await user.click(screen.getByRole('button', { name: 'Delete sample-delta-lobe.csv' }))
    expect(screen.queryByRole('switch', { name: 'sample-delta-lobe.csv' })).not.toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'sample-small-field.csv' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Re-centre' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete sample-small-field.csv' }))
    expect(screen.queryByRole('switch', { name: 'sample-small-field.csv' })).not.toBeInTheDocument()
    expect(screen.getByText('Import a Polygon to place it here at true ground scale.')).toBeInTheDocument()
  })

  it('keeps a Polygon in the unit it was imported with', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('radio', { name: 'ft' }))
    await user.upload(screen.getByLabelText('Choose Polygon file'), csv('feet.csv', SQUARE))
    expect(await screen.findByText('9.3 ha')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'km' }))
    expect(screen.getByText('9.3 ha')).toBeInTheDocument()
    expect(screen.queryByText('1.00 km²')).not.toBeInTheDocument()
  })

  it('keeps measurement figures out of the sidebar until Add to list', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Measure' }))
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

    await user.click(screen.getByRole('button', { name: 'Measure' }))
    expect(screen.getByText('Segment 1')).toBeInTheDocument()
  })

  it('adds a closed measurement to the list and delete leaves an existing row', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /small field/i }))
    await screen.findByRole('switch', { name: 'sample-small-field.csv' })

    await user.click(screen.getByRole('button', { name: 'Measure' }))
    await user.click(screen.getByTestId('map'))
    await user.click(screen.getByTestId('map'))
    await user.click(screen.getByTestId('map'))
    await user.click(screen.getByTestId('map-double'))
    expect(screen.getByText('Area')).toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: 'Measured Polygon' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add to list' }))
    expect(await screen.findByRole('switch', { name: 'Measured Polygon' })).toBeInTheDocument()
    expect(screen.queryByText('Segment 1')).not.toBeInTheDocument()
    expect(screen.getAllByText('Planform area')).toHaveLength(2)
    expect(screen.getByRole('switch', { name: 'sample-small-field.csv' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Measure' }))
    await user.click(screen.getByTestId('map'))
    await user.click(screen.getByTestId('map'))
    await user.click(screen.getByRole('button', { name: 'Done' }))
    await user.click(screen.getByRole('button', { name: 'Delete measurement' }))
    expect(screen.queryByText('Segment 1')).not.toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Measured Polygon' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'sample-small-field.csv' })).toBeInTheDocument()
  })

  it('renames a Polygon and imports a UTM file as a local row plus a fixed twin', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /small field/i }))
    const rename = await screen.findByRole('button', { name: 'Rename sample-small-field.csv' })
    await user.click(rename)
    const field = screen.getByRole('textbox', { name: 'Name' })
    await user.clear(field)
    await user.type(field, 'Nile field')
    await user.keyboard('{Enter}')
    expect(screen.getByRole('switch', { name: 'Nile field' })).toBeInTheDocument()

    const utm = [
      '# UTM 36N',
      'Poly,Vert,X,Y,Z',
      '1,1,500000.00,3320000.00,0',
      '1,2,501000.00,3320000.00,0',
      '1,3,501000.00,3321000.00,0',
      '1,4,500000.00,3321000.00,0',
    ].join('\n')
    await user.upload(screen.getByLabelText('Choose Polygon file'), csv('utm-field.csv', utm))
    expect(await screen.findByRole('switch', { name: 'utm-field.csv' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'utm-field.csv (fixed)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export utm-field.csv (fixed)' })).toBeInTheDocument()
    expect(screen.getByRole('complementary').parentElement).toHaveStyle({ '--sidebar-width': '380px' })
  })
})
