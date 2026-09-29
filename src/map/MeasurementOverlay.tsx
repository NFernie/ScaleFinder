import { useMemo } from 'react'
import { Layer, Source } from 'react-map-gl/maplibre'
import type { Feature, FeatureCollection } from 'geojson'
import { toGeoJsonRing } from '../core/projection'
import { LngLat } from '../core/types'

interface Props {
  corners: LngLat[]
  closed: boolean
  /** Confirmed corners plus hover. Drawn under the committed stroke. */
  preview?: LngLat[]
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

const NAVY = '#0f172a'
const WHITE = '#ffffff'

function previewCollection(preview: LngLat[] | undefined): FeatureCollection | null {
  if (!preview || preview.length < 2) return null
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { kind: 'preview' },
        geometry: { type: 'LineString', coordinates: lineOf(preview, false) },
      },
    ],
  }
}

export default function MeasurementOverlay({ corners, closed, preview, guide, guideClosed, parts }: Props) {
  const lasso = guide !== undefined || parts !== undefined
  const previewData = useMemo(() => previewCollection(preview), [preview])
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

  const confirmedDrawable = lasso
    ? (guide?.length ?? 0) >= 2 || (parts ?? []).some((part) => part.length >= 2)
    : corners.length >= 2
  if (!confirmedDrawable && !previewData) return null
  const showFill = lasso ? (parts ?? []).some((part) => part.length >= 3) : closed

  return (
    <>
      {previewData && (
        <Source id="measurement-preview" type="geojson" data={previewData}>
          <Layer
            id="measurement-preview-casing"
            type="line"
            paint={{ 'line-color': NAVY, 'line-width': 4 }}
          />
          <Layer
            id="measurement-preview-line"
            type="line"
            paint={{ 'line-color': WHITE, 'line-width': 2 }}
          />
        </Source>
      )}
      {confirmedDrawable && (
        <Source id="measurement" type="geojson" data={data}>
          {showFill && (
            <Layer
              id="measurement-fill"
              type="fill"
              filter={['==', ['get', 'kind'], 'fill']}
              paint={{ 'fill-color': WHITE, 'fill-opacity': 0.2 }}
            />
          )}
          <Layer
            id="measurement-casing"
            type="line"
            filter={['==', ['get', 'kind'], 'line']}
            paint={{ 'line-color': NAVY, 'line-width': 4 }}
          />
          <Layer
            id="measurement-line"
            type="line"
            filter={['==', ['get', 'kind'], 'line']}
            paint={{ 'line-color': WHITE, 'line-width': 2 }}
          />
        </Source>
      )}
    </>
  )
}
