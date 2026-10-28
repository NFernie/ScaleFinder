import WfSchematicPanel from './WfSchematicPanel'

const CAPTION =
  'Type schematic for a tide-dominated, fluvial-influenced, wave-affected shoreline. Size and direction are not a measured map of this coast.'

interface Props {
  open: boolean
  pinId?: string
  frame: { width: number; height: number } | null
  onFrame: (frame: { width: number; height: number }) => void
  onClose: () => void
}

/** Tfw element complex set. Same panel behaviour as the Wf schematic, with the tidal-channel scene. */
export default function TfwECSschematic({ open, pinId = 'tfw-ecs-schematic-pin', frame, onFrame, onClose }: Props) {
  return (
    <WfSchematicPanel
      open={open}
      scene="tfw"
      pinId={pinId}
      frame={frame}
      onFrame={onFrame}
      onClose={onClose}
      title="Tfw Schematic"
      caption={CAPTION}
    />
  )
}
