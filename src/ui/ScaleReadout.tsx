import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { formatArea, formatLength } from '../core/format'
import { PolygonStats } from '../core/types'

interface Props {
  stats: PolygonStats
  vertexCount: number
  hasZ: boolean
}

interface FigureNote {
  label: string
  description: string
  equation: string
  value: string
}

function canHover(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches
  )
}

function FigureRow({
  figure,
  open,
  onOpen,
  onClose,
}: {
  figure: FigureNote
  open: boolean
  onOpen: () => void
  onClose: () => void
}) {
  const tipId = useId()
  const rowRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [below, setBelow] = useState(false)

  useLayoutEffect(() => {
    if (!open || !panelRef.current || !rowRef.current) return
    const sidebar = rowRef.current.closest('aside')
    const limit = sidebar?.getBoundingClientRect().top ?? 0
    const panelTop = panelRef.current.getBoundingClientRect().top
    setBelow(panelTop < limit + 4)
  }, [open])

  return (
    <div ref={rowRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onMouseEnter={onOpen}
        onMouseLeave={onClose}
        onFocus={onOpen}
        onBlur={(event) => {
          if (!rowRef.current?.contains(event.relatedTarget as Node | null)) onClose()
        }}
        onClick={() => {
          if (canHover()) return
          if (open) onClose()
          else onOpen()
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return
          event.preventDefault()
          onClose()
        }}
        className="pressable flex w-full items-baseline justify-between gap-3 px-3 py-2.5 text-left"
      >
        <span className="text-xs text-slate-400">{figure.label}</span>
        <span className="shrink-0 text-base font-semibold tabular-nums tracking-tight">
          {figure.value}
        </span>
      </button>
      {open && (
        <div
          ref={panelRef}
          id={tipId}
          role="tooltip"
          className={`absolute left-0 z-20 w-full rounded-lg border border-white/10 bg-surface px-3 py-2 text-left shadow-[0_2px_8px_rgb(0_0_0/0.35)] ${
            below ? 'top-full mt-1' : 'bottom-full mb-1'
          }`}
        >
          <p className="text-xs font-semibold text-slate-100">{figure.label}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">{figure.description}</p>
          <p className="mt-1 font-mono text-xs text-slate-100">{figure.equation}</p>
        </div>
      )}
    </div>
  )
}

export default function ScaleReadout({ stats, vertexCount, hasZ }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [openLabel, setOpenLabel] = useState<string | null>(null)

  useEffect(() => {
    if (!openLabel) return
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpenLabel(null)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenLabel(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [openLabel])

  const figures: FigureNote[] = [
    {
      label: 'Planform area',
      description: 'Horizontal area of the Polygon from X and Y. Z is ignored.',
      equation: 'A = ½ |Σ (xᵢ yᵢ₊₁ − xᵢ₊₁ yᵢ)|',
      value: formatArea(stats.areaM2),
    },
    {
      label: 'Max span',
      description: 'Longest straight line between any two vertices.',
      equation: 'd = max √[(xᵢ − xⱼ)² + (yᵢ − yⱼ)²]',
      value: formatLength(stats.maxSpanM),
    },
    {
      label: 'Equivalent square side',
      description: 'Side of a square with the same planform area.',
      equation: 'L = √A',
      value: formatLength(stats.characteristicLengthM),
    },
  ]

  return (
    <div ref={rootRef} className="w-full">
      <div className="divide-y divide-white/10 rounded-xl border border-white/10 bg-surface-overlay/60">
        {figures.map((figure) => (
          <FigureRow
            key={figure.label}
            figure={figure}
            open={openLabel === figure.label}
            onOpen={() => setOpenLabel(figure.label)}
            onClose={() =>
              setOpenLabel((current) => (current === figure.label ? null : current))
            }
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-400">
        {vertexCount} vertices{hasZ ? ' · Z present (elevation ignored for planform)' : ''}
      </p>
    </div>
  )
}
