import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { polygonAreaM2 } from '../core/geometry'
import { beginCircle, circleRadiusM, circleRing, setCircleCentre, setCircleEdge } from '../core/circle'
import { destinationPoint } from '../core/projection'
import { ringToDraft } from '../core/ringDraft'
import { beginSquare, setSquareOrigin } from '../core/square'
import ShapeMenu from './ShapeMenu'

const origin = { lng: 10, lat: 45 }
const edge = destinationPoint(origin, 2000, 90)

describe('ShapeMenu', () => {
  it('shows radius, area, and add for a ready circle', () => {
    setCircleEdge(setCircleCentre(beginCircle(), origin), edge)
    const radius = circleRadiusM(origin, edge)
    const draft = ringToDraft(circleRing(origin, radius), 'Circle')
    const areaM2 = draft ? polygonAreaM2(draft.raw) : null
    render(
      <ShapeMenu
        title="Circle"
        lengthLabel="Radius"
        lengthM={radius}
        areaM2={areaM2}
        message={null}
        canAdd={draft !== null}
        onAdd={vi.fn()}
        onDelete={vi.fn()}
      />,
    )
    expect(screen.getByText('Radius')).toBeInTheDocument()
    expect(screen.getByText('Area')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add to list' })).toBeInTheDocument()
  })

  it('shows rectangle and square toggles while placing a box', async () => {
    const user = userEvent.setup()
    const onShape = vi.fn()
    const draft = setSquareOrigin(beginSquare(), origin)
    render(
      <ShapeMenu
        title="Square"
        lengthLabel="Side"
        lengthM={null}
        areaM2={null}
        message={null}
        canAdd={false}
        shape={draft.shape}
        onShape={onShape}
        onAdd={vi.fn()}
        onDelete={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Rectangle' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Square' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Square' }))
    expect(onShape).toHaveBeenCalledWith('square')
  })
})
