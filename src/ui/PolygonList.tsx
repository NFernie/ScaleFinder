import { useState } from 'react'
import { computeStats } from '../core/geometry'
import { PolygonItem, verticesForPolygon } from '../core/polygonList'
import PolygonPreview from './PolygonPreview'
import ScaleReadout from './ScaleReadout'

interface Props {
  items: PolygonItem[]
  onToggle: (id: string) => void
  onColourChange: (id: string, colour: string) => void
  onReCentre: () => void
}

export default function PolygonList({ items, onToggle, onColourChange, onReCentre }: Props) {
  const [openNote, setOpenNote] = useState<{ id: string; label: string } | null>(null)
  const selectedCount = items.filter((item) => item.selected).length

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-100">2 · Polygons</h2>
        {selectedCount >= 2 && (
          <button
            type="button"
            onClick={onReCentre}
            className="pressable min-h-11 shrink-0 rounded-lg border border-white/15 px-3 text-sm text-slate-200 hover:bg-white/5"
          >
            Re-centre
          </button>
        )}
      </div>
      {selectedCount >= 1 && (
        <p className="mb-3 text-sm leading-relaxed text-slate-300">
          Drag a marker on the map to reposition that Polygon. It stays at true ground scale.
        </p>
      )}
      <ul className="flex flex-col gap-8">
        {items.map((item) => {
          const verticesM = verticesForPolygon(item)
          const stats = verticesM.length >= 3 ? computeStats(verticesM) : null
          return (
            <li key={item.id} className="flex min-w-0 flex-col gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={item.selected}
                  aria-label={item.sourceName}
                  onClick={() => onToggle(item.id)}
                  className="pressable flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5eead4]"
                >
                  <span
                    aria-hidden="true"
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-150 ${
                      item.selected ? 'bg-accent-strong' : 'bg-white/15'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.35)] transition-transform duration-150 ${
                        item.selected ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </span>
                  <span className="truncate text-sm font-medium text-slate-100">{item.sourceName}</span>
                </button>
                <input
                  type="color"
                  aria-label={`Colour for ${item.sourceName}`}
                  value={item.colour}
                  onChange={(event) => onColourChange(item.id, event.target.value.toLowerCase())}
                  className="h-11 w-11 shrink-0 cursor-pointer rounded-lg border border-white/15 bg-transparent p-1"
                />
              </div>
              {stats && (
                <ScaleReadout
                  stats={stats}
                  vertexCount={verticesM.length}
                  hasZ={item.hasZ}
                  openLabel={openNote?.id === item.id ? openNote.label : null}
                  onOpenLabelChange={(label) =>
                    setOpenNote(label ? { id: item.id, label } : null)
                  }
                />
              )}
              <PolygonPreview points={verticesM} colour={item.colour} size={96} className="w-24" />
            </li>
          )
        })}
      </ul>
    </section>
  )
}
