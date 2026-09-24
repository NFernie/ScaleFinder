import { useMemo } from 'react'
import { Layer, Marker, Source } from 'react-map-gl/maplibre'
import type { MarkerDragEvent } from 'react-map-gl/maplibre'
import type { FeatureCollection } from 'geojson'
import { toGeoJsonRing } from '../core/projection'
import { LngLat } from '../core/types'

interface Props {
  id: string
  rings: LngLat[][]
  anchor: LngLat
  colour: string
  sourceName: string
  fixed?: boolean
  rotateAt?: LngLat | null
  onAnchorChange: (next: LngLat) => void
  onRotate?: (pointer: LngLat) => void
}

export default function PolygonOverlay({
  id,
  rings,
  anchor,
  colour,
  sourceName,
  fixed = false,
  rotateAt = null,
  onAnchorChange,
  onRotate,
}: Props) {
  const data = useMemo<FeatureCollection>(() => {
    const features = rings.flatMap((ring) => {
      if (ring.length >= 3) {
        return [
          {
            type: 'Feature' as const,
            properties: { kind: 'fill' },
            geometry: { type: 'Polygon' as const, coordinates: [toGeoJsonRing(ring)] },
          },
          {
            type: 'Feature' as const,
            properties: { kind: 'line' },
            geometry: {
              type: 'LineString' as const,
              coordinates: ring.map((corner) => [corner.lng, corner.lat] as [number, number]),
            },
          },
        ]
      }
      if (ring.length === 2) {
        return [
          {
            type: 'Feature' as const,
            properties: { kind: 'line' },
            geometry: {
              type: 'LineString' as const,
              coordinates: ring.map((corner) => [corner.lng, corner.lat] as [number, number]),
            },
          },
        ]
      }
      return []
    })
    return { type: 'FeatureCollection', features }
  }, [rings])

  if (rings.every((ring) => ring.length < 2)) return null

  return (
    <>
      <Source id={`field-polygon-${id}`} type="geojson" data={data}>
        <Layer
          id={`field-polygon-fill-${id}`}
          type="fill"
          filter={['==', ['get', 'kind'], 'fill']}
          paint={{ 'fill-color': colour, 'fill-opacity': 0.32 }}
        />
        <Layer
          id={`field-polygon-outline-${id}`}
          type="line"
          filter={['==', ['get', 'kind'], 'line']}
          paint={{ 'line-color': colour, 'line-width': 2 }}
        />
      </Source>

      {!fixed && rotateAt && onRotate && (
        <Marker
          longitude={rotateAt.lng}
          latitude={rotateAt.lat}
          draggable
          onDragEnd={(e: MarkerDragEvent) => onRotate({ lng: e.lngLat.lng, lat: e.lngLat.lat })}
        >
          <div
            title={`Rotate ${sourceName}`}
            aria-label={`Rotate ${sourceName}`}
            className="flex h-11 w-11 touch-none cursor-grab items-center justify-center active:cursor-grabbing"
          >
            <span
              className="h-4 w-1.5 rounded-full border-2 border-white shadow-[0_2px_6px_rgb(0_0_0/0.45)]"
              style={{ backgroundColor: colour }}
            />
          </div>
        </Marker>
      )}

      {!fixed && (
        <Marker
          longitude={anchor.lng}
          latitude={anchor.lat}
          draggable
          onDrag={(e: MarkerDragEvent) =>
            onAnchorChange({ lng: e.lngLat.lng, lat: e.lngLat.lat })
          }
        >
          <div
            title={`Drag to reposition ${sourceName}`}
            aria-label={`Drag to reposition ${sourceName}`}
            className="flex h-11 w-11 touch-none cursor-grab items-center justify-center active:cursor-grabbing"
          >
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white shadow-[0_2px_6px_rgb(0_0_0/0.45)]"
              style={{ backgroundColor: colour }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
            </span>
          </div>
        </Marker>
      )}
    </>
  )
}
