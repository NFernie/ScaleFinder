import { useEffect, useRef, useState } from 'react'
import { centroid } from '../core/geometry'
import { partsForPolygon, PolygonItem } from '../core/polygonList'
import { projectToGeographic } from '../core/projection'
import { turnedParts } from '../core/rotation'
import { LngLat } from '../core/types'
import PolygonOverlay from './PolygonOverlay'
import { approachAngle } from './motion'

const TURN_MS = 220

function reducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

function useEasedRotation(target: number): number {
  const [shown, setShown] = useState(target)
  const shownRef = useRef(target)

  useEffect(() => {
    if (reducedMotion()) {
      shownRef.current = target
      setShown(target)
      return
    }
    const from = shownRef.current
    const started = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / TURN_MS)
      const next = approachAngle(from, target, t)
      shownRef.current = next
      setShown(next)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target])

  return shown
}

interface Props {
  item: PolygonItem
  onAnchorChange: (next: LngLat) => void
  onRotate: (pointer: LngLat) => void
}

export default function PlacedPolygon({ item, onAnchorChange, onRotate }: Props) {
  const rotation = useEasedRotation(item.fixed ? 0 : item.rotationDeg ?? 0)
  const parts = turnedParts(partsForPolygon(item), rotation)
  const origin = centroid(parts.flat())
  const rings = parts.map((part) => projectToGeographic(part, item.anchor, origin))
  const edge = item.referenceEdge
  const ring = edge ? rings[edge.part] : undefined
  const start = ring?.[edge?.edge ?? -1]
  const end = ring && edge ? ring[edge.edge + 1] : undefined
  const rotateAt =
    !item.fixed && start && end
      ? { lng: (start.lng + end.lng) / 2, lat: (start.lat + end.lat) / 2 }
      : null

  return (
    <PolygonOverlay
      id={item.id}
      rings={rings}
      fixed={item.fixed}
      rotateAt={rotateAt}
      anchor={item.anchor}
      colour={item.colour}
      sourceName={item.sourceName}
      onAnchorChange={onAnchorChange}
      onRotate={onRotate}
    />
  )
}
