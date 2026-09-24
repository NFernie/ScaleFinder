import { formatArea, formatLength } from '../core/format'
import { Measurement, readout } from '../core/measurement'

interface Props {
  measurement: Measurement
  onDone: () => void
  onDelete: () => void
  onAdd: () => void
}

export default function MeasureMenu({ measurement, onDone, onDelete, onAdd }: Props) {
  const figures = readout(measurement)
  const closed = measurement.status === 'polygon'

  return (
    <div className="flex min-h-0 flex-col gap-3 rounded-lg bg-surface/95 p-3 text-sm text-slate-100 shadow-[0_2px_8px_rgb(0_0_0/0.35)]">
      <div className="min-h-0 max-h-64 overflow-y-auto overscroll-contain">
        {figures.segments.length > 0 && (
          <ul className="flex flex-col gap-1">
            {figures.segments.map((segment) => (
              <li key={segment.label} className="flex items-baseline justify-between gap-3">
                <span className="text-slate-300">{segment.label}</span>
                <span className="tabular-nums">{formatLength(segment.metres)}</span>
              </li>
            ))}
            <li className="mt-2 flex items-baseline justify-between gap-3 pt-2 font-medium">
              <span>Total</span>
              <span className="tabular-nums">{formatLength(figures.totalM)}</span>
            </li>
            {figures.areaM2 !== null && (
              <li className="flex items-baseline justify-between gap-3 font-medium">
                <span>Area</span>
                <span className="tabular-nums">{formatArea(figures.areaM2)}</span>
              </li>
            )}
          </ul>
        )}
        {measurement.message && (
          <p role="status" className="text-slate-300">
            {measurement.message}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {measurement.status === 'adding' && (
          <button
            type="button"
            onClick={onDone}
            className="pressable min-h-11 rounded-lg bg-accent px-3 text-sm font-semibold text-teal-950 hover:brightness-105"
          >
            Done
          </button>
        )}
        {closed && (
          <button
            type="button"
            onClick={onAdd}
            className="pressable min-h-11 rounded-lg bg-accent px-3 text-sm font-semibold text-teal-950 hover:brightness-105"
          >
            Add to list
          </button>
        )}
        <button
          type="button"
          aria-label="Delete measurement"
          onClick={onDelete}
          className="pressable min-h-11 rounded-lg bg-surface-overlay px-3 text-sm text-red-400 hover:bg-white/10"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
