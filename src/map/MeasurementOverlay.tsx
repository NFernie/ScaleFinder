import { useMemo } from 'react'
import { Layer, Source } from 'react-map-gl/maplibre'
import type { Feature, FeatureCollection } from 'geojson'
import { toGeoJsonRing } from '../core/projection'
import { LngLat } from '../core/types'

interface Props {
  corners: LngLat[]
  closed: boolean
  /** Lasso stroke. Present only while a Lasso draft exists. */
  guide?: LngLat[]
  guideClosed?: boolean
  /** Colour outline. One ring per patch. */
  parts?: LngLat[][]
}

function lineOf(points: LngLat[], closed: boolean): [number, number][] {
  const line = points.map((corner) => [corner.lng, corner.lat] as [number, number])
  if (closed && line.length > 0) line.push(line[0])
  return line
}

export default function MeasurementOverlay({ corners, closed, guide, guideClosed, parts }: Props) {
  const lasso = guide !== undefined || parts !== undefined
  const data = useMemo<FeatureCollection>(() => {
    if (lasso) {
      const features: Feature[] = []
      for (const part of parts ?? []) {
        if (part.length >= 3) {
          features.push({
            type: 'Feature',
            properties: { kind: 'fill' },
            geometry: { type: 'Polygon', coordinates: [toGeoJsonRing(part)] },
          })
          features.push({
            type: 'Feature',
            properties: { kind: 'line' },
            geometry: { type: 'LineString', coordinates: lineOf(part, true) },
          })
        } else if (part.length >= 2) {
          features.push({
            type: 'Feature',
            properties: { kind: 'line' },
            geometry: { type: 'LineString', coordinates: lineOf(part, false) },
          })
        }
      }
      if (guide && guide.length >= 2) {
        features.push({
          type: 'Feature',
          properties: { kind: 'line' },
          geometry: { type: 'LineString', coordinates: lineOf(guide, guideClosed === true) },
        })
      }
      return { type: 'FeatureCollection', features }
    }

    const ring = closed && corners.length >= 3 ? toGeoJsonRing(corners) : null
    const line = lineOf(corners, Boolean(ring))
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
  }, [corners, closed, guide, guideClosed, lasso, parts])

  const drawable = lasso
    ? (guide?.length ?? 0) >= 2 || (parts ?? []).some((part) => part.length >= 2)
    : corners.length >= 2
  if (!drawable) return null
  const showFill = lasso ? (parts ?? []).some((part) => part.length >= 3) : closed

  return (
    <Source id="measurement" type="geojson" data={data}>
      {showFill && (
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
