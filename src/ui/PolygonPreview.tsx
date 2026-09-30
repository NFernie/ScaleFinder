import { Fragment } from 'react'
import { Vertex } from '../core/types'

interface Props {
  parts: Vertex[][]
  size?: number
  colour?: string
  className?: string
}

function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '')
  const r = Number.parseInt(value.slice(0, 2), 16)
  const g = Number.parseInt(value.slice(2, 4), 16)
  const b = Number.parseInt(value.slice(4, 6), 16)
  if (![r, g, b].every((channel) => Number.isFinite(channel))) {
    return `rgba(45,212,191,${alpha})`
  }
  return `rgba(${r},${g},${b},${alpha})`
}

function pull(
  from: { px: number; py: number },
  toward: { px: number; py: number },
  inset: number,
): { px: number; py: number } {
  const length = Math.hypot(toward.px - from.px, toward.py - from.py)
  if (length === 0) return { px: from.px, py: from.py }
  const travel = Math.min(inset, length / 2)
  const t = travel / length
  return {
    px: from.px + (toward.px - from.px) * t,
    py: from.py + (toward.py - from.py) * t,
  }
}

function isClosed(part: Vertex[]): boolean {
  if (part.length < 2) return false
  const first = part[0]
  const last = part[part.length - 1]
  return first.x === last.x && first.y === last.y
}

function toPointsString(projected: { px: number; py: number }[]): string {
  return projected.map((p) => `${p.px},${p.py}`).join(' ')
}

/** Renders the polygon normalised to fit a square viewport, preserving aspect ratio. */
export default function PolygonPreview({
  parts,
  size = 220,
  colour = '#2dd4bf',
  className = 'w-full',
}: Props) {
  const strokeableParts = parts.filter((part) => part.length >= 2)

  if (strokeableParts.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-surface-overlay text-sm text-slate-400">
        Polygon preview
      </div>
    )
  }

  const pad = 16
  const bboxVertices = strokeableParts.flat()
  const xs = bboxVertices.map((p) => p.x)
  const ys = bboxVertices.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const spanX = maxX - minX || 1
  const spanY = maxY - minY || 1
  const scale = (size - pad * 2) / Math.max(spanX, spanY)
  const offsetX = (size - spanX * scale) / 2
  const offsetY = (size - spanY * scale) / 2

  const projectPart = (part: Vertex[]) =>
    part.map((p) => ({
      px: offsetX + (p.x - minX) * scale,
      py: size - (offsetY + (p.y - minY) * scale),
    }))

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Field Polygon preview"
      className={`h-auto rounded-lg bg-surface-overlay ${className}`}
    >
      {parts.map((part, index) => {
        if (part.length < 2) return null
        const projected = projectPart(part)
        const closed = isClosed(part)

        let strokeProjected = projected
        if (!closed && projected.length >= 3) {
          const first = pull(projected[0], projected[1], 8)
          const last = pull(
            projected[projected.length - 1],
            projected[projected.length - 2],
            8,
          )
          strokeProjected = [first, ...projected.slice(1, -1), last]
        }

        let fillProjected: { px: number; py: number }[] | null = null
        if (projected.length >= 3) {
          fillProjected = closed
            ? projected
            : [...projected, projected[0]]
        }

        return (
          <Fragment key={index}>
            {fillProjected && (
              <polygon
                points={toPointsString(fillProjected)}
                fill={withAlpha(colour, 0.18)}
              />
            )}
            <polyline
              points={toPointsString(strokeProjected)}
              fill="none"
              stroke={colour}
              strokeWidth={2}
              strokeLinejoin="round"
            />
          </Fragment>
        )
      })}
    </svg>
  )
}
