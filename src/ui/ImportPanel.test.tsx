import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ImportPanel from './ImportPanel'

describe('ImportPanel', () => {
  it('renders the unit selector and samples', () => {
    render(
      <ImportPanel
        unit="m"
        onUnitChange={() => {}}
        onImport={() => {}}
        onLoadSample={() => {}}
        error={null}
        sourceName={null}
      />,
    )
    expect(screen.getByRole('radio', { name: 'm' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'ft' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delta lobe/i })).toBeInTheDocument()
    expect(screen.getByText(/two-column file of X and Y/i)).toBeInTheDocument()
    expect(screen.getByText(/Polygon here/)).toBeInTheDocument()
    expect(screen.getByLabelText('Choose Polygon file')).toBeInTheDocument()
  })

  it('fires onUnitChange when a unit is picked', () => {
    const onUnitChange = vi.fn()
    render(
      <ImportPanel
        unit="m"
        onUnitChange={onUnitChange}
        onImport={() => {}}
        onLoadSample={() => {}}
        error={null}
        sourceName={null}
      />,
    )
    fireEvent.click(screen.getByRole('radio', { name: 'ft' }))
    expect(onUnitChange).toHaveBeenCalledWith('ft')
  })

  it('fires onLoadSample with the sample id', () => {
    const onLoadSample = vi.fn()
    render(
      <ImportPanel
        unit="m"
        onUnitChange={() => {}}
        onImport={() => {}}
        onLoadSample={onLoadSample}
        error={null}
        sourceName={null}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /small field/i }))
    expect(onLoadSample).toHaveBeenCalledWith('small-field')
  })

  it('names the file just added and hides that line while an error is showing', () => {
    const { rerender } = render(
      <ImportPanel
        unit="m"
        onUnitChange={() => {}}
        onImport={() => {}}
        onLoadSample={() => {}}
        error={null}
        sourceName="field-a.csv"
      />,
    )
    expect(screen.getByText(/Loaded/)).toHaveTextContent('field-a.csv')
    expect(screen.getByRole('button', { name: /delta lobe/i })).not.toHaveAttribute('aria-pressed')

    rerender(
      <ImportPanel
        unit="m"
        onUnitChange={() => {}}
        onImport={() => {}}
        onLoadSample={() => {}}
        error="Bad file"
        sourceName="field-a.csv"
      />,
    )
    expect(screen.queryByText(/Loaded/)).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Bad file')
  })

  it('shows an error message', () => {
    render(
      <ImportPanel
        unit="m"
        onUnitChange={() => {}}
        onImport={() => {}}
        onLoadSample={() => {}}
        error="Bad file"
        sourceName={null}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Bad file')
    expect(screen.getByRole('alert')).toHaveTextContent(/try another file/i)
  })

  it('moves the unit with arrow keys', () => {
    const onUnitChange = vi.fn()
    render(
      <ImportPanel
        unit="m"
        onUnitChange={onUnitChange}
        onImport={() => {}}
        onLoadSample={() => {}}
        error={null}
        sourceName={null}
      />,
    )
    fireEvent.keyDown(screen.getByRole('radio', { name: 'm' }), { key: 'ArrowRight' })
    expect(onUnitChange).toHaveBeenCalledWith('ft')
  })
})
