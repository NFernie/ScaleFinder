import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import TfwECSschematic from './TfwECSschematic'
import WfSchematicPin from '../map/WfSchematicPin'
import { TFW_ECS_ANCHOR } from '../core/tfwEcsSchematic'

vi.mock('react-map-gl/maplibre', () => ({
  Marker: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

function Harness() {
  const [open, setOpen] = useState(false)
  const [frame, setFrame] = useState<{ width: number; height: number } | null>(null)
  return (
    <>
      <WfSchematicPin
        anchor={TFW_ECS_ANCHOR}
        id="tfw-ecs-schematic-pin"
        label="Tfw schematic"
        onOpen={() => setOpen(true)}
      />
      <TfwECSschematic open={open} frame={frame} onFrame={setFrame} onClose={() => setOpen(false)} />
    </>
  )
}

it('opens the Tfw element complex set from its pin', async () => {
  const user = userEvent.setup()
  render(<Harness />)
  await user.click(screen.getByRole('button', { name: 'Tfw schematic' }))
  const dialog = screen.getByRole('dialog', { name: 'Tfw Schematic' })
  expect(within(dialog).getByText('Tfw element complex set')).toBeInTheDocument()
  expect(within(dialog).getByText('Tfw-Lobe')).toBeInTheDocument()
  expect(within(dialog).getByText('Tfw-Mouth Bar')).toBeInTheDocument()
  expect(
    within(dialog).getByText(
      'Type schematic for a tide-dominated, fluvial-influenced, wave-affected shoreline. Size and direction are not a measured map of this coast.',
    ),
  ).toBeInTheDocument()
})
