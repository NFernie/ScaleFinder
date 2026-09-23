import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RegionSearch from './RegionSearch'

describe('RegionSearch', () => {
  it('keeps the search field and lists regions in a scrollable list', async () => {
    const onSelect = vi.fn()
    render(<RegionSearch selectedName="Nile Delta" onSelect={onSelect} />)

    expect(screen.getByRole('searchbox', { name: 'Search regions' })).toBeInTheDocument()
    const list = screen.getByRole('list', { name: 'Regions' })
    expect(list.className).toContain('overflow-y-auto')
    expect(screen.getByRole('button', { name: 'Nile Delta' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Amazon River' })).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Amazon River' }))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: 'Amazon River' }))
  })

  it('filters the list without replacing the search field', async () => {
    render(<RegionSearch selectedName={null} onSelect={() => {}} />)
    const user = userEvent.setup()
    await user.type(screen.getByRole('searchbox', { name: 'Search regions' }), 'nile')
    expect(screen.getByRole('button', { name: 'Nile Delta' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Amazon River' })).not.toBeInTheDocument()
  })
})
