import { Vertex } from '../core/types'

interface Props {
  points: Vertex[]
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

/** Renders the polygon normalised to fit a square viewport, preserving aspect ratio. */
export default function PolygonPreview({
  points,
  size = 220,
  colour = '#2dd4bf',
  className = 'w-full',
}: Props) {
  if (points.length < 3) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-white/10 bg-black/30 text-sm text-slate-400">
        Polygon preview
      </div>
    )
  }

  const pad = 16
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const spanX = maxX - minX || 1
  const spanY = maxY - minY || 1
  const scale = (size - pad * 2) / Math.max(spanX, spanY)
  const offsetX = (size - spanX * scale) / 2
  const offsetY = (size - spanY * scale) / 2

  const projected = points.map((p) => ({
    px: offsetX + (p.x - minX) * scale,
    py: size - (offsetY + (p.y - minY) * scale), // flip so north is up
  }))
  const path = projected.map((p) => `${p.px},${p.py}`).join(' ')

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Field Polygon preview"
      className={`h-auto rounded-xl border border-white/10 bg-black/30 ${className}`}
    >
      <polygon
        points={path}
        fill={withAlpha(colour, 0.18)}
        stroke={colour}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {projected.map((p, i) => (
        <circle key={i} cx={p.px} cy={p.py} r={3} fill="#eafffb" stroke="#0f766e" />
      ))}
    </svg>
  )
}
