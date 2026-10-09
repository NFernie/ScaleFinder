import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { forwardRef, ReactNode, useLayoutEffect, useState } from 'react'
import { sceneAt } from '../core/wfSchematic'
import WfSchematicPin from '../map/WfSchematicPin'
import WfSchematicPanel from './WfSchematicPanel'

const FOCUS_RING = 'focus-visible:outline-[#5eead4]'
const SECTION_CHROME_PX = 24 + 2

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
  expect(within(dialog).queryByRole('button', { name: 'Zoom out' })).not.toBeInTheDocument()
  expect(dialog.querySelector('.overflow-hidden')).toBeNull()
  expect(within(dialog).getAllByRole('listitem')).toHaveLength(sceneAt(0).length)
  expect(
    within(dialog)
      .getAllByRole('listitem')
      .some((item) => item.textContent?.replace(/\s+/g, ' ').includes('Wf-Lobe · inside Wf element complex set')),
  ).toBe(true)
  const frame = within(dialog).getByTestId('wf-schematic-frame')
  expect(frame).toHaveStyle({ width: '328px', height: '224px' })
  expect(dialog).toHaveStyle({ width: `${328 + SECTION_CHROME_PX}px` })
  expect(within(dialog).getByRole('button', { name: 'Close' })).toHaveClass(FOCUS_RING)
  expect(within(dialog).getByRole('button', { name: 'Resize schematic view' })).toHaveClass(FOCUS_RING)
  const slider = within(dialog).getByRole('slider', { name: 'Explode' })
  expect(slider).toHaveClass(FOCUS_RING)
  frame.focus()
  await user.click(within(dialog).getByRole('button', { name: 'Resize schematic view' }))
  await user.keyboard('{ArrowLeft}')
  expect(frame).toHaveStyle({ width: '328px' })
  await user.keyboard('{ArrowRight}')
  expect(frame).toHaveStyle({ width: '344px' })
  expect(dialog).toHaveStyle({ width: `${344 + SECTION_CHROME_PX}px` })
  const before = within(dialog).getAllByRole('listitem').map((item) => item.textContent)
  slider.focus()
  fireEvent.change(slider, { target: { value: '1' } })
  fireEvent.keyDown(slider, { key: 'End' })
  expect(within(dialog).getAllByRole('listitem').map((item) => item.textContent)).toEqual(before)
  expect(within(dialog).getAllByText('Mouth bar').length).toBeGreaterThan(1)
  await user.click(within(dialog).getByRole('button', { name: 'Close' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Wf schematic, Sfântu Gheorghe' })).toHaveFocus()
  await user.click(screen.getByRole('button', { name: 'Wf schematic, Sfântu Gheorghe' }))
  expect(screen.getByTestId('wf-schematic-frame')).toHaveStyle({ width: '344px' })
})

it('returns focus to the pin on Escape', async () => {
  const user = userEvent.setup()
  render(<Harness />)
  const pin = screen.getByRole('button', { name: 'Wf schematic, Sfântu Gheorghe' })
  await user.click(pin)
  expect(screen.getByRole('dialog', { name: 'Wf Schematic' })).toBeInTheDocument()
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(pin).toHaveFocus()
})

it('stops the frame at the map inset', async () => {
  const user = userEvent.setup()
  render(<Harness />)
  await user.click(screen.getByRole('button', { name: 'Wf schematic, Sfântu Gheorghe' }))
  const dialog = screen.getByRole('dialog', { name: 'Wf Schematic' })
  const wrapper = document.createElement('div')
  const map = document.createElement('div')
  Object.defineProperty(dialog, 'offsetParent', { configurable: true, get: () => wrapper })
  Object.defineProperty(wrapper, 'offsetParent', { configurable: true, get: () => map })
  map.getBoundingClientRect = () =>
    ({
      width: 400,
      height: 400,
      top: 0,
      left: 0,
      right: 400,
      bottom: 400,
      x: 0,
      y: 0,
      toJSON() {
        return {}
      },
    }) as DOMRect
  const frame = within(dialog).getByTestId('wf-schematic-frame')
  await user.click(within(dialog).getByRole('button', { name: 'Resize schematic view' }))
  for (let step = 0; step < 8; step += 1) await user.keyboard('{ArrowRight}')
  expect(frame).toHaveStyle({ width: '350px' })
})

it('keeps the caption, slider, and full list when the view cannot start', async () => {
  vi.resetModules()
  vi.doMock('./WfSchematicView', () => ({
    __esModule: true,
    default: forwardRef(function FailedSchematicView(
      { onUnavailable }: { onUnavailable?: () => void },
      _ref,
    ) {
      useLayoutEffect(() => {
        onUnavailable?.()
      }, [onUnavailable])
      return <div data-testid="wf-view" />
    }),
  }))
  const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
    return { getExtension: () => ({ loseContext() {} }) } as unknown as WebGLRenderingContext
  })
  const { default: Panel } = await import('./WfSchematicPanel')
  function Local() {
    const [open, setOpen] = useState(true)
    const [frame, setFrame] = useState<{ width: number; height: number } | null>(null)
    return <Panel open={open} frame={frame} onFrame={setFrame} onClose={() => setOpen(false)} />
  }
  render(<Local />)
  const dialog = await screen.findByRole('dialog', { name: 'Wf Schematic' })
  expect(await within(dialog).findAllByRole('listitem')).not.toHaveLength(0)
  expect(within(dialog).getByText(/Type schematic/)).toBeInTheDocument()
  expect(within(dialog).getByRole('slider', { name: 'Explode' })).toBeInTheDocument()
  expect(within(dialog).queryByRole('button', { name: 'Zoom in' })).not.toBeInTheDocument()
  expect(within(dialog).getAllByRole('listitem')).toHaveLength(sceneAt(0).length)
  const before = within(dialog).getAllByRole('listitem').map((item) => item.textContent)
  fireEvent.change(within(dialog).getByRole('slider', { name: 'Explode' }), { target: { value: '1' } })
  expect(within(dialog).getAllByRole('listitem').map((item) => item.textContent)).toEqual(before)
  getContext.mockRestore()
  vi.doUnmock('./WfSchematicView')
  vi.resetModules()
})
