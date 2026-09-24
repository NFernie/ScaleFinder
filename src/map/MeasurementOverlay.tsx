import { useMemo } from 'react'
import { Layer, Source } from 'react-map-gl/maplibre'
import type { FeatureCollection } from 'geojson'
import { toGeoJsonRing } from '../core/projection'
import { LngLat } from '../core/types'

interface Props {
  corners: LngLat[]
  closed: boolean
}

export default function MeasurementOverlay({ corners, closed }: Props) {
  const data = useMemo<FeatureCollection>(() => {
    const ring = closed && corners.length >= 3 ? toGeoJsonRing(corners) : null
    const line = corners.map((corner) => [corner.lng, corner.lat] as [number, number])
    if (ring) line.push(line[0])
    return {
      type: 'FeatureCollection',
      features: [
        ...(ring
          ? [
              {
                type: 'Feature' as const,
                properties: { kind: 'fill' },
                geometry: { type: 'Polygon' as const, coordinates: [ring] },
              },
            ]
          : []),
        {
          type: 'Feature',
          properties: { kind: 'line' },
          geometry: { type: 'LineString', coordinates: line },
        },
      ],
    }
  }, [corners, closed])

  if (corners.length < 2) return null

  return (
    <Source id="measurement" type="geojson" data={data}>
      {closed && (
        <Layer
          id="measurement-fill"
          type="fill"
          filter={['==', ['get', 'kind'], 'fill']}
          paint={{ 'fill-color': '#ffffff', 'fill-opacity': 0.2 }}
        />
      )}
      <Layer
        id="measurement-casing"
        type="line"
        filter={['==', ['get', 'kind'], 'line']}
        paint={{ 'line-color': '#0f172a', 'line-width': 4 }}
      />
      <Layer
        id="measurement-line"
        type="line"
        filter={['==', ['get', 'kind'], 'line']}
        paint={{ 'line-color': '#ffffff', 'line-width': 2 }}
      />
    </Source>
  )
}
