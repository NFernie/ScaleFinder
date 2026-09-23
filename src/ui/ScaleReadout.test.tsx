import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ScaleReadout from './ScaleReadout'
import { computeStats } from '../core/geometry'
import { Vertex } from '../core/types'

const square5km: Vertex[] = [
  { x: 0, y: 0 },
  { x: 5000, y: 0 },
  { x: 5000, y: 5000 },
  { x: 0, y: 5000 },
]

describe('ScaleReadout', () => {
  it('shows area, span and the equivalent square side', () => {
    render(<ScaleReadout stats={computeStats(square5km)} vertexCount={4} hasZ={false} />)
    expect(screen.getByText('Planform area')).toBeInTheDocument()
    expect(screen.getByText('Equivalent square side')).toBeInTheDocument()
    expect(screen.queryByText('Characteristic length')).not.toBeInTheDocument()
    expect(screen.getByText('25.00 km²')).toBeInTheDocument()
    expect(screen.getByText('4 vertices')).toBeInTheDocument()
  })

  it('shows the planform equation while that row is hovered', () => {
    render(<ScaleReadout stats={computeStats(square5km)} vertexCount={4} hasZ={false} />)
    fireEvent.mouseEnter(screen.getByRole('button', { name: /planform area/i }))
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      'A = ½ |Σ (xᵢ yᵢ₊₁ − xᵢ₊₁ yᵢ)|',
    )
  })

  it('notes when Z is present', () => {
    render(<ScaleReadout stats={computeStats(square5km)} vertexCount={4} hasZ={true} />)
    expect(screen.getByText(/Z present/)).toBeInTheDocument()
  })
})
