import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beginLasso, commitLassoRing } from '../core/lasso'
import LassoMenu from './LassoMenu'

const a = { lng: 10, lat: 45 }
const b = { lng: 10.01, lat: 45 }
const c = { lng: 10.01, lat: 45.01 }

describe('LassoMenu', () => {
  it('shows radius and contrast while aiming and prompts for a map click', () => {
    const lasso = beginLasso()
    render(<LassoMenu lasso={lasso} onSettings={vi.fn()} onAdd={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByLabelText('Radius')).toHaveValue(48)
    expect(screen.getByLabelText('Contrast')).toHaveValue(32)
    expect(screen.getByText('Click a feature on the map.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add to list' })).not.toBeInTheDocument()
  })

  it('shows Add to list when a ring is ready', () => {
    const lasso = commitLassoRing(beginLasso(), [a, b, c], null)
    render(<LassoMenu lasso={lasso} onSettings={vi.fn()} onAdd={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Add to list' })).toBeInTheDocument()
  })

  it('calls onSettings when radius changes', async () => {
    const user = userEvent.setup()
    const onSettings = vi.fn()
    render(<LassoMenu lasso={beginLasso()} onSettings={onSettings} onAdd={vi.fn()} onDelete={vi.fn()} />)
    const radius = screen.getByLabelText('Radius')
    await user.clear(radius)
    await user.type(radius, '64')
    expect(onSettings).toHaveBeenCalled()
  })
})
