import { Marker } from 'react-map-gl/maplibre'

interface Props {
  anchor: { lat: number; lng: number }
  id: string
  label: string
  onOpen: () => void
}

export default function WfSchematicPin({ anchor, id, label, onOpen }: Props) {
  return (
    <Marker longitude={anchor.lng} latitude={anchor.lat} anchor="center">
      <button
        type="button"
        id={id}
        aria-label={label}
        title={label}
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
