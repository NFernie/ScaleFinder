import { formatArea, formatLength } from '../core/format'
import { BoxShape } from '../core/square'

interface Props {
  title: string
  lengthLabel: string
  lengthM: number | null
  areaM2: number | null
  message: string | null
  canAdd: boolean
  shape?: BoxShape
  onShape?: (shape: BoxShape) => void
  onAdd: () => void
  onDelete: () => void
}

export default function ShapeMenu({ title, lengthLabel, lengthM, areaM2, message, canAdd, shape, onShape, onAdd, onDelete }: Props) {
  return (
    <div className="flex min-h-0 flex-col gap-3 rounded-xl border border-white/15 bg-surface/95 p-3 text-sm text-slate-100 shadow-[0_2px_8px_rgb(0_0_0/0.35)]">
      <p className="font-medium">{title}</p>
      {shape && onShape && (
        <div className="flex gap-2">
          {(['rectangle', 'square'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={shape === option}
              onClick={() => onShape(option)}
              className={`pressable min-h-11 flex-1 rounded-lg border px-3 text-sm ${shape === option ? 'border-accent bg-accent-strong text-teal-50' : 'border-white/15 text-white'}`}
            >
              {option === 'rectangle' ? 'Rectangle' : 'Square'}
            </button>
          ))}
        </div>
      )}
      {lengthM !== null && (
        <p className="flex justify-between gap-3"><span>{lengthLabel}</span><span className="tabular-nums">{formatLength(lengthM)}</span></p>
      )}
      {areaM2 !== null && (
        <p className="flex justify-between gap-3"><span>Area</span><span className="tabular-nums">{formatArea(areaM2)}</span></p>
      )}
      {message && <p role="status" className="text-slate-300">{message}</p>}
      <div className="flex flex-wrap gap-2">
        {canAdd && (
          <button type="button" onClick={onAdd} className="pressable min-h-11 rounded-lg bg-accent px-3 text-sm font-semibold text-teal-950 hover:brightness-105">
            Add to list
          </button>
        )}
        <button type="button" aria-label="Delete measurement" onClick={onDelete} className="pressable min-h-11 rounded-lg border border-white/15 px-3 text-sm text-red-400 hover:bg-white/5">
          Delete
        </button>
      </div>
    </div>
  )
}
