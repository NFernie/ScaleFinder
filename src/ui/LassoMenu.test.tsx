import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { appendGuidePoint, beginLasso, setLassoBehaviour, type LassoDraft } from '../core/lasso'
import LassoMenu from './LassoMenu'
import { LASSO_CONTRAST_TITLE, LASSO_RADIUS_TITLE } from './ToolboxTooltips'

const a = { lng: 10, lat: 45 }
const b = { lng: 10.01, lat: 45 }
const c = { lng: 10.01, lat: 45.01 }

describe('LassoMenu', () => {
  it('shows radius and contrast while drawing and prompts for a stroke', () => {
    const lasso = beginLasso()
    render(<LassoMenu lasso={lasso} onSettings={vi.fn()} onBehaviour={vi.fn()} onAdd={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByLabelText('Radius')).toHaveValue(48)
    expect(screen.getByLabelText('Contrast')).toHaveValue(32)
    expect(screen.getByText('Radius').closest('label')).toHaveAttribute('title', LASSO_RADIUS_TITLE)
    expect(screen.getByText('Contrast').closest('label')).toHaveAttribute('title', LASSO_CONTRAST_TITLE)
    expect(screen.getByText('Drag or click on the map. Double-click to close.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add to list' })).not.toBeInTheDocument()
  })

  it('shows Add to list when a colour ring exists', () => {
    const lasso: LassoDraft = { ...beginLasso(), status: 'closed', guide: [a, b, c], parts: [[a, b, c]] }
    render(<LassoMenu lasso={lasso} onSettings={vi.fn()} onBehaviour={vi.fn()} onAdd={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Add to list' })).toBeInTheDocument()
    expect(screen.getByLabelText('Radius')).toBeDisabled()
  })

  it('calls onSettings when radius changes', async () => {
    const user = userEvent.setup()
    const onSettings = vi.fn()
    render(<LassoMenu lasso={beginLasso()} onSettings={onSettings} onBehaviour={vi.fn()} onAdd={vi.fn()} onDelete={vi.fn()} />)
    const radius = screen.getByLabelText('Radius')
    await user.clear(radius)
    await user.type(radius, '64')
    expect(onSettings).toHaveBeenCalled()
  })

  it('offers three behaviours and hides radius for outline', async () => {
    const user = userEvent.setup()
    const onBehaviour = vi.fn()
    const { rerender } = render(
      <LassoMenu lasso={beginLasso()} onSettings={vi.fn()} onBehaviour={onBehaviour} onAdd={vi.fn()} onDelete={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: 'Dynamic' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Static' }))
    expect(onBehaviour).toHaveBeenCalledWith('static')
    expect(screen.getByRole('button', { name: 'Outline' }).closest('span')).toHaveAttribute(
      'title',
      'Click and drag the outline. The stroke is the Polygon. Map colour is ignored.',
    )
    const outline = setLassoBehaviour(beginLasso(), 'outline')
    rerender(<LassoMenu lasso={outline} onSettings={vi.fn()} onBehaviour={onBehaviour} onAdd={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.queryByLabelText('Radius')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Contrast')).not.toBeInTheDocument()
  })

  it('disables the behaviour buttons after the first point', () => {
    const lasso = appendGuidePoint(beginLasso(), { lng: 10, lat: 45 })
    render(<LassoMenu lasso={lasso} onSettings={vi.fn()} onBehaviour={vi.fn()} onAdd={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Dynamic' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Static' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Outline' })).toBeDisabled()
  })

  it('shows the vertex hint only when a closed ring exists', () => {
    const open = beginLasso()
    const { rerender } = render(
      <LassoMenu lasso={open} onSettings={vi.fn()} onBehaviour={vi.fn()} onAdd={vi.fn()} onDelete={vi.fn()} />,
    )
    expect(screen.queryByText('Right-click a side or corner to add or delete a vertex.')).not.toBeInTheDocument()
    const closed: LassoDraft = {
      ...beginLasso(),
      status: 'closed',
      guide: [a, b, c],
      parts: [[a, b, c]],
    }
    rerender(<LassoMenu lasso={closed} onSettings={vi.fn()} onBehaviour={vi.fn()} onAdd={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Right-click a side or corner to add or delete a vertex.')).toBeInTheDocument()
  })
})
