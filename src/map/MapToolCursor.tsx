import type { ToolId } from '../core/toolboxSession'
import { lassoCursorDiameterPx } from './toolCursor'

const STROKE_WHITE = '#ffffff'
const STROKE_NAVY = '#0f172a'
const SHAPE_SIZE_PX = 24

interface Props {
  tool: ToolId
  lassoRadiusPx?: number
  x: number
  y: number
}

function Ring({ diameter }: { diameter: number }) {
  const r = diameter / 2
  return (
    <>
      <circle r={r} fill="none" stroke={STROKE_NAVY} strokeWidth={4} />
      <circle r={r} fill="none" stroke={STROKE_WHITE} strokeWidth={2} />
    </>
  )
}

function Crosshair() {
  const half = 12
  const arm = 1.25
  return (
    <g>
      <line x1={-half} y1={0} x2={half} y2={0} stroke={STROKE_NAVY} strokeWidth={4} />
      <line x1={0} y1={-half} x2={0} y2={half} stroke={STROKE_NAVY} strokeWidth={4} />
      <line x1={-half} y1={0} x2={half} y2={0} stroke={STROKE_WHITE} strokeWidth={2} />
      <line x1={0} y1={-half} x2={0} y2={half} stroke={STROKE_WHITE} strokeWidth={2} />
      <circle r={arm} fill={STROKE_WHITE} stroke={STROKE_NAVY} strokeWidth={1.5} />
    </g>
  )
}

function SquareMark() {
  const half = SHAPE_SIZE_PX / 2
  return (
    <>
      <rect
        x={-half}
        y={-half}
        width={SHAPE_SIZE_PX}
        height={SHAPE_SIZE_PX}
        fill="none"
        stroke={STROKE_NAVY}
        strokeWidth={4}
      />
      <rect
        x={-half}
        y={-half}
        width={SHAPE_SIZE_PX}
        height={SHAPE_SIZE_PX}
        fill="none"
        stroke={STROKE_WHITE}
        strokeWidth={2}
      />
    </>
  )
}

function Mark({ tool, lassoRadiusPx }: { tool: ToolId; lassoRadiusPx?: number }) {
  switch (tool) {
    case 'polygon':
    case 'ruler':
      return <Crosshair />
    case 'circle':
      return <Ring diameter={SHAPE_SIZE_PX} />
    case 'square':
      return <SquareMark />
    case 'lasso':
      return <Ring diameter={lassoCursorDiameterPx(lassoRadiusPx)} />
  }
}

export default function MapToolCursor({ tool, lassoRadiusPx, x, y }: Props) {
  const pad =
    tool === 'lasso'
      ? lassoCursorDiameterPx(lassoRadiusPx) / 2 + 4
      : tool === 'polygon' || tool === 'ruler'
        ? 14
        : SHAPE_SIZE_PX / 2 + 4
  const size = pad * 2

  return (
    <div
      className="pointer-events-none absolute z-20"
      style={{ left: x, top: y, width: size, height: size, transform: 'translate(-50%, -50%)' }}
      aria-hidden="true"
    >
      <svg width={size} height={size} viewBox={`${-pad} ${-pad} ${size} ${size}`} className="overflow-visible">
        <Mark tool={tool} lassoRadiusPx={lassoRadiusPx} />
      </svg>
    </div>
  )
}
