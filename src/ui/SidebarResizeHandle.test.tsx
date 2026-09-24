import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import SidebarResizeHandle from './SidebarResizeHandle'

function Harness() {
  const [width, setWidth] = useState(380)
  return (
    <div data-testid="column" style={{ ['--sidebar-width' as string]: `${width}px` }}>
      <SidebarResizeHandle width={width} containerWidth={() => 1200} onWidth={setWidth} />
    </div>
  )
}

describe('SidebarResizeHandle', () => {
  it('moves 16px with the arrow keys and keeps the default at 380', () => {
    render(<Harness />)
    expect(screen.getByTestId('column')).toHaveStyle({ '--sidebar-width': '380px' })
    const handle = screen.getByRole('separator', { name: 'Resize sidebar', hidden: true })
    fireEvent.keyDown(handle, { key: 'ArrowRight' })
    expect(screen.getByTestId('column')).toHaveStyle({ '--sidebar-width': '396px' })
    fireEvent.keyDown(handle, { key: 'ArrowLeft' })
    expect(screen.getByTestId('column')).toHaveStyle({ '--sidebar-width': '380px' })
  })
})
