import { useCallback, useEffect, useRef, useState } from 'react'
import { sceneAt, type Rank } from '../core/wfSchematic'
import {
  fitSchematicFrame,
  FRAME_KEY_STEP_PX,
  FRAME_START,
  mapFrameElementFromPanel,
  panelVerticalChromePx,
  PANEL_VERTICAL_CHROME_FALLBACK_PX,
  schematicFrameLimits,
} from './schematicFrame'
import WfSchematicView, { type SchematicCameraHandle } from './WfSchematicView'

let webglProbe: boolean | undefined

export function webglAvailable(): boolean {
  if (webglProbe !== undefined) return webglProbe
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl2') || canvas.getContext('webgl')
    webglProbe = Boolean(context)
    if (context) context.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    webglProbe = false
  }
  return webglProbe
}

const RANK_ORDER: Record<Rank, number> = {
  'element-complex-set': 0,
  'element-complex': 1,
  'element-set': 2,
  element: 3,
}

const FRAME_RATIO = FRAME_START.width / FRAME_START.height

const CAPTION =
  'Type schematic for a wave-dominated, fluvial-influenced shoreline. Size and direction are not a measured map of this coast.'

const TAP_HIGHLIGHT = { WebkitTapHighlightColor: 'transparent' } as const

interface Props {
  open: boolean
  frame: { width: number; height: number } | null
  onFrame: (frame: { width: number; height: number }) => void
  onClose: () => void
}

function sortedBodies() {
  const bodies = sceneAt(0)
  const byId = new Map(bodies.map((body) => [body.id, body]))
  return [...bodies].sort((a, b) => {
    const rankDelta = RANK_ORDER[a.rank] - RANK_ORDER[b.rank]
    if (rankDelta !== 0) return rankDelta
    return a.id.localeCompare(b.id)
  }).map((body) => ({
    body,
    parentName: body.parentId ? byId.get(body.parentId)?.name : undefined,
  }))
}

function maxFrameDimensions(section: HTMLElement | null): { maxWidth: number; maxHeight: number } {
  const map = mapFrameElementFromPanel(section)
  if (!map) {
    return { maxWidth: Number.POSITIVE_INFINITY, maxHeight: Number.POSITIVE_INFINITY }
  }
  const verticalChrome = section
    ? panelVerticalChromePx(section)
    : PANEL_VERTICAL_CHROME_FALLBACK_PX
  return schematicFrameLimits(map.getBoundingClientRect(), verticalChrome)
}

export default function WfSchematicPanel({ open, frame, onFrame, onClose }: Props) {
  const [explode, setExplode] = useState(0)
  const [minWidth, setMinWidth] = useState(FRAME_START.width)
  const sectionRef = useRef<HTMLElement>(null)
  const cameraRef = useRef<SchematicCameraHandle>(null)
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null)

  useEffect(() => {
    if (open) setExplode(0)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      document.getElementById('wf-schematic-pin')?.focus()
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open || frame !== null) return
    const { maxWidth, maxHeight } = maxFrameDimensions(sectionRef.current)
    if (maxWidth < FRAME_START.width && maxWidth !== Number.POSITIVE_INFINITY) {
      const fitted = fitSchematicFrame({
        width: maxWidth,
        ratio: FRAME_RATIO,
        minWidth: 0,
        maxWidth,
        maxHeight,
      })
      setMinWidth(fitted.width)
      onFrame(fitted)
    } else {
      setMinWidth(FRAME_START.width)
      onFrame(FRAME_START)
    }
  }, [open, frame, onFrame])

  const applyWidth = useCallback(
    (nextWidth: number) => {
      const { maxWidth, maxHeight } = maxFrameDimensions(sectionRef.current)
      onFrame(
        fitSchematicFrame({
          width: nextWidth,
          ratio: FRAME_RATIO,
          minWidth,
          maxWidth,
          maxHeight,
        }),
      )
    },
    [minWidth, onFrame],
  )

  const onResizeKey = (event: React.KeyboardEvent) => {
    if (!frame) return
    let delta = 0
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') delta = FRAME_KEY_STEP_PX
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') delta = -FRAME_KEY_STEP_PX
    if (delta === 0) return
    event.preventDefault()
    applyWidth(frame.width + delta)
  }

  const onResizePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!frame) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.focus()
    dragRef.current = { startX: event.clientX, startWidth: frame.width }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const onResizePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag) return
    event.preventDefault()
    event.stopPropagation()
    applyWidth(drag.startWidth - (event.clientX - drag.startX))
  }

  const onResizePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current) return
    dragRef.current = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  if (!open) return null

  const showText = !webglAvailable()
  const width = frame?.width ?? FRAME_START.width
  const height = frame?.height ?? FRAME_START.height
  const rows = sortedBodies()

  return (
    <section
      ref={sectionRef}
      role="dialog"
      aria-label="Wf Schematic"
      style={{ width: width + 24 }}
      className="toolbox-pop pointer-events-auto w-[min(22rem,calc(100vw-1.5rem))] rounded-xl border border-white/15 bg-surface-raised/95 p-3 text-sm text-slate-100 shadow-[0_2px_8px_rgb(0_0_0/0.35)]"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-100">Wf Schematic</h2>
        <button
          type="button"
          onClick={() => {
            document.getElementById('wf-schematic-pin')?.focus()
            onClose()
          }}
          className="pressable min-h-11 rounded-lg px-3 text-sm text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5eead4]"
        >
          Close
        </button>
      </div>
      <p className="mb-3 text-xs leading-relaxed text-slate-300">{CAPTION}</p>
      <div
        data-testid="wf-schematic-frame"
        className="relative"
        style={{ width, height, touchAction: 'none' }}
      >
        <button
          type="button"
          aria-label="Resize schematic view"
          onKeyDown={onResizeKey}
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
          onPointerCancel={onResizePointerUp}
          className="pressable absolute left-0 top-0 z-10 h-11 w-11 touch-none rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5eead4]"
          style={TAP_HIGHLIGHT}
        />
        {!showText && (
          <div className="absolute right-2 top-2 z-10 flex flex-col overflow-hidden rounded-[4px] bg-white shadow-[0_0_0_2px_rgb(0_0_0/0.1)]">
            <button
              type="button"
              aria-label="Zoom in"
              style={TAP_HIGHLIGHT}
              onClick={(event) => {
                event.stopPropagation()
                cameraRef.current?.zoomBy('in')
              }}
              className="pressable flex h-[29px] w-[29px] items-center justify-center bg-white text-[#333] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5eead4]"
            >
              +
            </button>
            <button
              type="button"
              aria-label="Zoom out"
              style={TAP_HIGHLIGHT}
              onClick={(event) => {
                event.stopPropagation()
                cameraRef.current?.zoomBy('out')
              }}
              className="pressable flex h-[29px] w-[29px] items-center justify-center border-t border-[#ddd] bg-white text-[#333] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5eead4]"
            >
              −
            </button>
          </div>
        )}
        {showText ? (
          <ul className="h-full min-h-0 space-y-1 overflow-auto text-xs text-slate-100">
            {rows.map(({ body, parentName }) => (
              <li key={body.id}>
                <span>{body.name}</span>
                {parentName ? ` · inside ${parentName}` : ''}
              </li>
            ))}
          </ul>
        ) : (
          <WfSchematicView ref={cameraRef} explode={explode} width={width} height={height} />
        )}
      </div>
      <label className="mt-3 block text-xs">
        Explode
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={explode}
          aria-label="Explode"
          onChange={(event) => setExplode(Number(event.target.value))}
          onKeyDown={(event) => {
            if (event.key === 'End') {
              event.preventDefault()
              setExplode(1)
            }
          }}
          className="mt-1 w-full"
        />
      </label>
    </section>
  )
}
