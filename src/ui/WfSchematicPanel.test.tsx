import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReactNode, useState } from 'react'
import WfSchematicPin from '../map/WfSchematicPin'
import WfSchematicPanel from './WfSchematicPanel'

vi.mock('react-map-gl/maplibre', () => ({
  Marker: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

function Harness() {
  const [open, setOpen] = useState(false)
  const [frame, setFrame] = useState<{ width: number; height: number } | null>(null)
  return (
    <>
      <WfSchematicPin onOpen={() => setOpen(true)} />
      <WfSchematicPanel open={open} frame={frame} onFrame={setFrame} onClose={() => setOpen(false)} />
    </>
  )
}

it('lists the Wf bodies when the panel is open', async () => {
  const user = userEvent.setup()
  render(<Harness />)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Wf schematic, Sfântu Gheorghe' }))
  const dialog = screen.getByRole('dialog', { name: 'Wf Schematic' })
  expect(within(dialog).queryByText('Sfântu Gheorghe')).not.toBeInTheDocument()
  expect(within(dialog).queryByText('Wf schematic')).not.toBeInTheDocument()
  expect(
    within(dialog).getByText(
      'Type schematic for a wave-dominated, fluvial-influenced shoreline. Size and direction are not a measured map of this coast.',
    ),
  ).toBeInTheDocument()
  const items = within(dialog).getAllByRole('listitem')
  expect(items[0]).toHaveTextContent('Wf element complex set')
  expect(within(dialog).getByText('Wf-Lobe')).toBeInTheDocument()
  expect(within(dialog).getByText('Wf-Mouth Bar')).toBeInTheDocument()
  expect(within(dialog).getAllByText('Beach ridge').length).toBeGreaterThan(0)
  expect(within(dialog).queryByText('Swale')).not.toBeInTheDocument()
  expect(within(dialog).getAllByText('Mouth bar').length).toBeGreaterThan(0)
  expect(within(dialog).getByText('Channel fill')).toBeInTheDocument()
  expect(within(dialog).queryByRole('button', { name: 'Zoom in' })).not.toBeInTheDocument()
  const frame = within(dialog).getByTestId('wf-schematic-frame')
  expect(frame).toHaveStyle({ width: '328px', height: '224px' })
  frame.focus()
  await user.click(within(dialog).getByRole('button', { name: 'Resize schematic view' }))
  await user.keyboard('{ArrowRight}')
  expect(frame).toHaveStyle({ width: '344px' })
  const slider = within(dialog).getByRole('slider', { name: 'Explode' })
  slider.focus()
  fireEvent.keyDown(slider, { key: 'End' })
  expect(within(dialog).getAllByText('Mouth bar').length).toBeGreaterThan(1)
  await user.click(within(dialog).getByRole('button', { name: 'Close' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Wf schematic, Sfântu Gheorghe' })).toHaveFocus()
  await user.click(screen.getByRole('button', { name: 'Wf schematic, Sfântu Gheorghe' }))
  expect(screen.getByTestId('wf-schematic-frame')).toHaveStyle({ width: '344px' })
})
