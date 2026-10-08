import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReactNode, useState } from 'react'
import WfSchematicPin from '../map/WfSchematicPin'
import WfSchematicPanel from './WfSchematicPanel'

vi.mock('react-map-gl/maplibre', () => ({
  Marker: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

function Harness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <WfSchematicPin onOpen={() => setOpen(true)} />
      <WfSchematicPanel open={open} onClose={() => setOpen(false)} />
    </>
  )
}

it('lists the Wf bodies when the panel is open', async () => {
  const user = userEvent.setup()
  render(<Harness />)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Wf schematic, Sfântu Gheorghe' }))
  expect(screen.getByRole('dialog', { name: 'Sfântu Gheorghe' })).toBeInTheDocument()
  expect(screen.getByText('Wf schematic')).toBeInTheDocument()
  expect(
    screen.getByText(
      'Type schematic for a wave-dominated, fluvial-influenced shoreline. Size and direction are not a measured map of this coast.',
    ),
  ).toBeInTheDocument()
  expect(screen.getByText('Wf-Lobe')).toBeInTheDocument()
  expect(screen.getByText('Wf-Mouth Bar')).toBeInTheDocument()
  expect(screen.getAllByText('Beach ridge').length).toBeGreaterThan(0)
  expect(screen.getAllByText('Swale').length).toBeGreaterThan(0)
  expect(screen.getAllByText('Mouth bar').length).toBeGreaterThan(0)
  expect(screen.getByText('Channel fill')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Close' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Wf schematic, Sfântu Gheorghe' })).toHaveFocus()
})
