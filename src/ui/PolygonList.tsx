import { useRef, useState } from 'react'
import { commitPolygonName } from '../core/polygonExport'
import { displayStats, partsForPolygon, PolygonItem, verticesForPolygon } from '../core/polygonList'
import { commitBearing, measureEdgeBearing, turnedParts } from '../core/rotation'
import PolygonPreview from './PolygonPreview'
import ScaleReadout from './ScaleReadout'

interface Props {
  items: PolygonItem[]
  onToggle: (id: string) => void
  onColourChange: (id: string, colour: string) => void
  onReCentre: () => void
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
  onBearing: (id: string, bearing: number) => void
  onExport: (id: string) => void
  onExportSelected: () => void
  exportNotes: Record<string, string>
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={`shrink-0 transition-transform duration-150 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
    >
      <path
        d="M4 6.5 8 10.5 12 6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function PolygonList({
  items,
  onToggle,
  onColourChange,
  onReCentre,
  onDelete,
  onRename,
  onBearing,
  onExport,
  onExportSelected,
  exportNotes,
}: Props) {
  const [openNote, setOpenNote] = useState<{ id: string; label: string } | null>(null)
  const [figuresOpen, setFiguresOpen] = useState<Record<string, boolean>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [bearingId, setBearingId] = useState<string | null>(null)
  const [draftBearing, setDraftBearing] = useState('')
  const cancelEdit = useRef(false)
  const cancelBearing = useRef(false)
  const selectedCount = items.filter((item) => item.selected).length

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-100">2 · Polygons</h2>
        {selectedCount >= 2 && (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={onExportSelected}
              className="pressable min-h-11 rounded-lg bg-surface-overlay px-3 text-sm text-slate-200 hover:bg-white/10"
            >
              Export selected
            </button>
            <button
              type="button"
              onClick={onReCentre}
              className="pressable min-h-11 rounded-lg bg-surface-overlay px-3 text-sm text-slate-200 hover:bg-white/10"
            >
              Re-centre
            </button>
          </div>
        )}
      </div>
      {selectedCount >= 1 && (
        <p className="mb-3 text-sm leading-relaxed text-slate-300">
          Drag the round marker to reposition a Polygon. Drag the bar on its edge to rotate it. It stays at true ground scale.
        </p>
      )}
      <ul className="flex flex-col gap-8">
        {items.map((item) => {
          const verticesM = verticesForPolygon(item)
          const previewPoints = item.fixed
            ? verticesM
            : turnedParts(partsForPolygon(item), item.rotationDeg ?? 0).flat()
          const stats = displayStats(item)
          const bearing =
            !item.fixed && item.referenceEdge
              ? measureEdgeBearing(
                  partsForPolygon(item),
                  item.anchor,
                  item.rotationDeg ?? 0,
                  item.referenceEdge,
                )
              : null
          const saveBearing = () => {
            const next = commitBearing(draftBearing)
            if (next !== null) onBearing(item.id, next)
            setBearingId(null)
          }
          const saveName = () => {
            onRename(item.id, commitPolygonName(draftName, item.sourceName))
            setEditingId(null)
          }
          const figuresShown = figuresOpen[item.id] ?? true
          const figuresId = `figures-${item.id}`
          return (
            <li key={item.id} className="flex min-w-0 flex-col gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={item.selected}
                  aria-label={item.sourceName}
                  onClick={() => onToggle(item.id)}
                  className="pressable flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
                >
                  <span
                    aria-hidden="true"
                    className={`relative h-6 w-11 rounded-full transition-colors duration-150 ${
                      item.selected ? 'bg-accent-strong' : 'bg-white/15'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.35)] transition-transform duration-150 ${
                        item.selected ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </span>
                </button>
                {editingId === item.id ? (
                  <input
                    aria-label="Name"
                    value={draftName}
                    autoFocus
                    onChange={(event) => setDraftName(event.target.value)}
                    onBlur={() => {
                      if (cancelEdit.current) {
                        cancelEdit.current = false
                        return
                      }
                      saveName()
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') event.currentTarget.blur()
                      if (event.key === 'Escape') {
                        cancelEdit.current = true
                        setEditingId(null)
                      }
                    }}
                    className="min-h-11 min-w-0 flex-1 rounded-lg bg-surface-overlay px-3 text-sm text-white"
                  />
                ) : (
                  <button
                    type="button"
                    aria-label={`Rename ${item.sourceName}`}
                    onClick={() => {
                      setEditingId(item.id)
                      setDraftName(item.sourceName)
                    }}
                    className="pressable min-h-11 min-w-0 flex-1 truncate rounded-lg px-1 text-left text-sm font-medium text-slate-100"
                  >
                    {item.sourceName}
                  </button>
                )}
                <input
                  type="color"
                  aria-label={`Colour for ${item.sourceName}`}
                  value={item.colour}
                  onChange={(event) => onColourChange(item.id, event.target.value.toLowerCase())}
                  className="h-11 w-11 shrink-0 cursor-pointer rounded-lg bg-surface-overlay p-1"
                />
                <button
                  type="button"
                  aria-label={`Export ${item.sourceName}`}
                  onClick={() => onExport(item.id)}
                  className="pressable min-h-11 shrink-0 rounded-lg bg-surface-overlay px-3 text-sm text-slate-200 hover:bg-white/10"
                >
                  Export
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${item.sourceName}`}
                  onClick={() => onDelete(item.id)}
                  className="pressable min-h-11 shrink-0 rounded-lg bg-surface-overlay px-3 text-sm text-red-400 hover:bg-white/10"
                >
                  Delete
                </button>
              </div>
              {bearing !== null &&
                (bearingId === item.id ? (
                  <input
                    aria-label={`Bearing for ${item.sourceName}`}
                    value={draftBearing}
                    autoFocus
                    inputMode="decimal"
                    onChange={(event) => setDraftBearing(event.target.value)}
                    onBlur={() => {
                      if (cancelBearing.current) {
                        cancelBearing.current = false
                        return
                      }
                      saveBearing()
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') event.currentTarget.blur()
                      if (event.key === 'Escape') {
                        cancelBearing.current = true
                        setBearingId(null)
                      }
                    }}
                    className="min-h-11 w-28 rounded-lg bg-surface-overlay px-3 text-sm tabular-nums text-white"
                  />
                ) : (
                  <button
                    type="button"
                    aria-label={`Bearing for ${item.sourceName}`}
                    onClick={() => {
                      setBearingId(item.id)
                      setDraftBearing(bearing.toFixed(1))
                    }}
                    className="pressable min-h-11 w-28 rounded-lg bg-surface-overlay px-3 text-left text-sm tabular-nums text-slate-200 hover:bg-white/10"
                  >
                    {bearing.toFixed(1)}°
                  </button>
                ))}
              {exportNotes[item.id] && (
                <p role="status" className="text-xs leading-relaxed text-amber-200">
                  {exportNotes[item.id]}
                </p>
              )}
              {stats && verticesM.length > 0 && (
                <div>
                  <button
                    type="button"
                    aria-expanded={figuresShown}
                    aria-controls={figuresId}
                    onClick={() =>
                      setFiguresOpen((current) => ({ ...current, [item.id]: !figuresShown }))
                    }
                    className="pressable flex min-h-11 w-full items-center justify-between rounded-lg bg-surface-overlay px-3 text-sm text-slate-200 hover:bg-white/10"
                  >
                    {figuresShown ? 'Hide figures' : 'Show figures'}
                    <Chevron open={figuresShown} />
                  </button>
                  {figuresShown && (
                    <div id={figuresId} className="mt-3">
                      <ScaleReadout
                        stats={stats}
                        vertexCount={verticesM.length}
                        hasZ={item.hasZ}
                        openLabel={openNote?.id === item.id ? openNote.label : null}
                        onOpenLabelChange={(label) =>
                          setOpenNote(label ? { id: item.id, label } : null)
                        }
                      />
                    </div>
                  )}
                </div>
              )}
              <PolygonPreview points={previewPoints} colour={item.colour} size={96} className="w-24" />
            </li>
          )
        })}
      </ul>
    </section>
  )
}
