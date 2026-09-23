import { useMemo } from 'react'
import { Layer, Marker, Source } from 'react-map-gl/maplibre'
import type { MarkerDragEvent } from 'react-map-gl/maplibre'
import type { FeatureCollection } from 'geojson'
import { toGeoJsonRing } from '../core/projection'
import { LngLat } from '../core/types'

interface Props {
  ring: LngLat[]
  anchor: LngLat
  onAnchorChange: (next: LngLat) => void
}

export default function PolygonOverlay({ ring, anchor, onAnchorChange }: Props) {
  const data = useMemo<FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: { type: 'Polygon', coordinates: [toGeoJsonRing(ring)] },
        },
      ],
    }),
    [ring],
  )

  if (ring.length < 3) return null

  return (
    <>
      <Source id="field-polygon" type="geojson" data={data}>
        <Layer
          id="field-polygon-fill"
          type="fill"
          paint={{ 'fill-color': '#2dd4bf', 'fill-opacity': 0.32 }}
        />
        <Layer
          id="field-polygon-outline"
          type="line"
          paint={{ 'line-color': '#5eead4', 'line-width': 2 }}
        />
      </Source>

      <Marker
        longitude={anchor.lng}
        latitude={anchor.lat}
        draggable
        onDragEnd={(e: MarkerDragEvent) =>
          onAnchorChange({ lng: e.lngLat.lng, lat: e.lngLat.lat })
        }
      >
        <div
          title="Drag to reposition the polygon"
          className="flex h-5 w-5 cursor-grab items-center justify-center rounded-full border-2 border-white bg-accent-strong shadow-lg active:cursor-grabbing"
        >
          <div className="h-1.5 w-1.5 rounded-full bg-white" />
        </div>
      </Marker>
    </>
  )
}
