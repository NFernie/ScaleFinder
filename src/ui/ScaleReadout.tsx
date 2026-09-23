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
    <div className="w-full">
      <dl className="divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-surface-overlay/60">
        {items.map((it) => (
          <div key={it.label} className="flex items-baseline justify-between gap-3 px-3 py-2.5">
            <dt className="text-xs text-slate-400">{it.label}</dt>
            <dd className="shrink-0 text-base font-semibold tabular-nums tracking-tight">{it.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-slate-400">
        {vertexCount} vertices{hasZ ? ' · Z present (elevation ignored for planform)' : ''}
      </p>
    </div>
  )
}
