import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
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
  it('shows area, span and characteristic length', () => {
    render(<ScaleReadout stats={computeStats(square5km)} vertexCount={4} hasZ={false} />)
    expect(screen.getByText('Planform area')).toBeInTheDocument()
    expect(screen.getByText('25.00 km²')).toBeInTheDocument()
    expect(screen.getByText('4 vertices')).toBeInTheDocument()
  })

  it('notes when Z is present', () => {
    render(<ScaleReadout stats={computeStats(square5km)} vertexCount={4} hasZ={true} />)
    expect(screen.getByText(/Z present/)).toBeInTheDocument()
  })
})
