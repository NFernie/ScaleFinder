import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

vi.mock('./map/MapView', () => import('./test/MapViewStub'))

vi.mock('./map/PolygonOverlay', () => ({
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
})
