import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import VertexMenu from './VertexMenu'

describe('VertexMenu', () => {
  it('runs add and delete and closes on Escape', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    const onDelete = vi.fn()
    const onClose = vi.fn()
    render(
      <VertexMenu x={10} y={10} frame={{ width: 400, height: 300 }} onAdd={onAdd} onDelete={onDelete} onClose={onClose} />,
    )
    const add = screen.getByRole('menuitem', { name: 'Add vertex' })
    expect(add).toHaveFocus()
    await user.click(add)
    expect(onAdd).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('menuitem', { name: 'Delete vertex' }))
    expect(onDelete).toHaveBeenCalledOnce()
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})
