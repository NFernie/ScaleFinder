import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beginLasso, type LassoDraft } from '../core/lasso'
import LassoMenu from './LassoMenu'
import { LASSO_CONTRAST_TITLE, LASSO_RADIUS_TITLE } from './ToolboxTooltips'

const a = { lng: 10, lat: 45 }
const b = { lng: 10.01, lat: 45 }
const c = { lng: 10.01, lat: 45.01 }

describe('LassoMenu', () => {
  it('shows radius and contrast while drawing and prompts for a stroke', () => {
    const lasso = beginLasso()
    render(<LassoMenu lasso={lasso} onSettings={vi.fn()} onAdd={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByLabelText('Radius')).toHaveValue(48)
    expect(screen.getByLabelText('Contrast')).toHaveValue(32)
    expect(screen.getByText('Radius').closest('label')).toHaveAttribute('title', LASSO_RADIUS_TITLE)
    expect(screen.getByText('Contrast').closest('label')).toHaveAttribute('title', LASSO_CONTRAST_TITLE)
    expect(screen.getByText('Drag or click on the map. Double-click to close.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add to list' })).not.toBeInTheDocument()
  })

  it('shows Add to list when a colour ring exists', () => {
    const lasso: LassoDraft = { ...beginLasso(), status: 'closed', guide: [a, b, c], parts: [[a, b, c]] }
    render(<LassoMenu lasso={lasso} onSettings={vi.fn()} onAdd={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Add to list' })).toBeInTheDocument()
    expect(screen.getByLabelText('Radius')).toBeDisabled()
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
