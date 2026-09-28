import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { destinationPoint } from '../core/projection'
import { addRulerCorner, beginRuler, finishDistanceRuler } from '../core/ruler'
import RulerMenu from './RulerMenu'

const origin = { lng: 10, lat: 45 }
const east = destinationPoint(origin, 1000, 90)

describe('RulerMenu', () => {
  it('shows segments and total for a done ruler without area or add', () => {
    const ruler = finishDistanceRuler(addRulerCorner(addRulerCorner(beginRuler(), origin), east))
    render(<RulerMenu ruler={ruler} onDone={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Segment 1')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete measurement' })).toBeInTheDocument()
    expect(screen.queryByText('Area')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add to list' })).not.toBeInTheDocument()
  })

  it('shows a message when Done is pressed with one point', async () => {
    const user = userEvent.setup()
    const onDone = vi.fn(() => {
      /* parent applies finishDistanceRuler */
    })
    const ruler = addRulerCorner(beginRuler(), origin)
    const { rerender } = render(<RulerMenu ruler={ruler} onDone={onDone} onDelete={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(onDone).toHaveBeenCalled()
    rerender(
      <RulerMenu
        ruler={finishDistanceRuler(ruler)}
        onDone={onDone}
        onDelete={vi.fn()}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Add at least two points.')
  })
})
