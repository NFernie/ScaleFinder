import { Marker } from 'react-map-gl/maplibre'
import { WF_ANCHOR } from '../core/wfSchematic'

interface Props {
  onOpen: () => void
}

export default function WfSchematicPin({ onOpen }: Props) {
  return (
    <Marker longitude={WF_ANCHOR.lng} latitude={WF_ANCHOR.lat} anchor="center">
      <button
        type="button"
        id="wf-schematic-pin"
        aria-label="Wf schematic, Sfântu Gheorghe"
        title="Wf schematic, Sfântu Gheorghe"
        onClick={(event) => {
          event.stopPropagation()
          onOpen()
        }}
        className="pressable flex h-11 w-11 items-center justify-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5eead4]"
      >
        <span className="h-3 w-3 rounded-full border-2 border-white bg-accent shadow-[0_2px_6px_rgb(0_0_0/0.45)]" />
      </button>
    </Marker>
  )
}
