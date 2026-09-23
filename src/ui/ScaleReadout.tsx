import { formatArea, formatLength } from '../core/format'
import { PolygonStats } from '../core/types'

interface Props {
  stats: PolygonStats
  vertexCount: number
  hasZ: boolean
}

export default function ScaleReadout({ stats, vertexCount, hasZ }: Props) {
  const items = [
    { label: 'Planform area', value: formatArea(stats.areaM2) },
    { label: 'Max span', value: formatLength(stats.maxSpanM) },
    { label: 'Characteristic length', value: formatLength(stats.characteristicLengthM) },
  ]
  return (
    <div>
      <dl className="grid grid-cols-3 gap-2">
        {items.map((it) => (
          <div
            key={it.label}
            className="rounded-lg border border-white/10 bg-surface-overlay/60 p-3"
          >
            <dt className="text-[11px] text-slate-400">{it.label}</dt>
            <dd className="mt-1 text-lg font-semibold">{it.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-slate-400">
        {vertexCount} vertices{hasZ ? ' · Z present (elevation ignored for planform)' : ''}
      </p>
    </div>
  )
}
