import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { closedSession, chooseTool, toggleMenu, ToolboxSession } from '../core/toolboxSession'
import Toolbox from './Toolbox'

function Harness() {
  const [session, setSession] = useState<ToolboxSession>(closedSession())
  return (
    <Toolbox
      session={session}
      onToggle={() => setSession((current) => toggleMenu(current))}
      onChoose={(tool) => setSession((current) => chooseTool(current, tool))}
    />
  )
}

it('renders bento tool buttons with accessible names', () => {
  render(<Toolbox session={{ ...closedSession(), menuOpen: true }} onToggle={() => {}} onChoose={() => {}} />)
  expect(screen.getByRole('button', { name: /polygon/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /square/i })).toBeInTheDocument()
})

it('replaces Measure with a popup of five tools', async () => {
  const user = userEvent.setup()
  render(<Harness />)
  expect(screen.queryByRole('button', { name: 'Measure' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Toolbox' }))
  expect(screen.getByRole('button', { name: 'Polygon' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Ruler' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Lasso' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Circle' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /square/i })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Polygon' }))
  expect(screen.getByRole('button', { name: 'Toolbox' })).toHaveAttribute('aria-pressed', 'true')
})
