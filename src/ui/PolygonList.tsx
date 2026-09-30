import { cloneElement, ReactElement, useRef, useState } from 'react'
import { commitPolygonName } from '../core/polygonExport'
import { displayStats, partsForPolygon, PolygonItem, verticesForPolygon } from '../core/polygonList'
import { commitBearing, measureEdgeBearing, turnedParts } from '../core/rotation'
import PolygonPreview from './PolygonPreview'
import ScaleReadout from './ScaleReadout'
import { tipFor } from './sidebarTooltips'

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
  onCentreOnFixed?: (id: string) => void
  exportNotes: Record<string, string>
}

const TIP_PANEL =
  'pointer-events-none invisible absolute left-0 top-full z-20 mt-1 w-56 max-w-full rounded-lg border border-white/15 bg-surface-raised/95 p-2 text-left text-xs text-slate-200 shadow-[0_2px_8px_rgb(0_0_0/0.35)] group-hover:visible group-focus-within:visible'

function ControlTip({
  id,
  tip,
  children,
}: {
  id: string
  tip: { title: string; body: string }
  children: ReactElement
}) {
  return (
    <div className="group relative">
      {cloneElement(children, { 'aria-describedby': id })}
      <div id={id} role="tooltip" className={TIP_PANEL}>
        <p className="font-medium text-white">{tip.title}</p>
        <p className="mt-0.5 leading-snug text-slate-300">{tip.body}</p>
      </div>
    </div>
  )
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
  onCentreOnFixed: _onCentreOnFixed,
  exportNotes,
}: Props) {
  const [sectionOpen, setSectionOpen] = useState(true)
  const [openNote, setOpenNote] = useState<{ id: string; label: string } | null>(null)
  const [figuresOpen, setFiguresOpen] = useState<Record<string, boolean>>({})
  const [outlineOpen, setOutlineOpen] = useState<Record<string, boolean>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [bearingId, setBearingId] = useState<string | null>(null)
  const [draftBearing, setDraftBearing] = useState('')
  const cancelEdit = useRef(false)
  const cancelBearing = useRef(false)
  const selectedCount = items.filter((item) => item.selected).length
  const sectionTip = tipFor('section', '')
  const exportSelectedTip = tipFor('exportSelected', '')
  const reCentreTip = tipFor('reCentre', '')

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="group relative min-w-0">
          <button
            type="button"
            aria-label="Polygons"
            aria-expanded={sectionOpen}
            aria-describedby="sidebar-tip-section"
            onClick={() => setSectionOpen((open) => !open)}
            className="pressable flex min-h-11 min-w-0 items-center gap-2 rounded-lg px-1 text-left text-sm font-semibold text-slate-100"
          >
            2 · Polygons
          </button>
          <div id="sidebar-tip-section" role="tooltip" className={TIP_PANEL}>
            <p className="font-medium text-white">{sectionTip.title}</p>
            <p className="mt-0.5 leading-snug text-slate-300">{sectionTip.body}</p>
          </div>
        </div>
        {selectedCount >= 2 && (
          <div className="flex shrink-0 gap-2">
            <ControlTip id="sidebar-tip-export-selected" tip={exportSelectedTip}>
              <button
                type="button"
                onClick={onExportSelected}
                className="pressable min-h-11 rounded-lg bg-surface-overlay px-3 text-sm text-slate-200 hover:bg-white/10"
              >
                Export selected
              </button>
            </ControlTip>
            <ControlTip id="sidebar-tip-re-centre" tip={reCentreTip}>
              <button
                type="button"
                onClick={onReCentre}
                className="pressable min-h-11 rounded-lg bg-surface-overlay px-3 text-sm text-slate-200 hover:bg-white/10"
              >
                Re-centre
              </button>
            </ControlTip>
          </div>
        )}
      </div>
      {sectionOpen && (
        <>
          {selectedCount >= 1 && (
            <p className="mb-3 text-sm leading-relaxed text-slate-300">
              Drag the round marker to reposition a Polygon. Drag the bar on its edge to rotate it. It
              stays at true ground scale.
            </p>
          )}
          <ul className="flex flex-col gap-8">
            {items.map((item) => {
              const verticesM = verticesForPolygon(item)
              const previewParts = item.fixed
                ? partsForPolygon(item)
                : turnedParts(partsForPolygon(item), item.rotationDeg ?? 0)
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
              const figuresShown = figuresOpen[item.id] ?? false
              const outlineShown = outlineOpen[item.id] ?? false
              const figuresId = `figures-${item.id}`
              const outlineId = `outline-${item.id}`
              const name = item.sourceName
              const rotationTip = tipFor('rotation', name)
              const renameTip = tipFor('rename', name)
              const switchTip = tipFor('switch', name)
              const colourTip = tipFor('colour', name)
              const exportTip = tipFor('export', name)
              const deleteTip = tipFor('delete', name)
              const extentTip = tipFor('extent', name, figuresShown ? 'Hide extent' : 'Show extent')
              const outlineTip = tipFor('outline', name, outlineShown ? 'Hide outline' : 'Show outline')
              return (
                <li key={item.id} className="flex min-w-0 flex-col gap-3">
                  {bearing !== null &&
                    (bearingId === item.id ? (
                      <ControlTip id={`sidebar-tip-rotation-${item.id}`} tip={rotationTip}>
                        <input
                          aria-label={rotationTip.title}
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
                          className="min-h-11 w-28 rounded-lg bg-surface-overlay px-3 text-base tabular-nums text-white"
                        />
                      </ControlTip>
                    ) : (
                      <ControlTip id={`sidebar-tip-rotation-${item.id}`} tip={rotationTip}>
                        <button
                          type="button"
                          aria-label={rotationTip.title}
                          onClick={() => {
                            setBearingId(item.id)
                            setDraftBearing(bearing.toFixed(1))
                          }}
                          className="pressable min-h-11 w-28 rounded-lg bg-surface-overlay px-3 text-left text-base tabular-nums text-slate-200 hover:bg-white/10"
                        >
                          {bearing.toFixed(1)}°
                        </button>
                      </ControlTip>
                    ))}
                  {editingId === item.id ? (
                    <ControlTip id={`sidebar-tip-rename-${item.id}`} tip={renameTip}>
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
                        className="min-h-11 w-full rounded-lg bg-surface-overlay px-3 text-base text-white"
                      />
                    </ControlTip>
                  ) : (
                    <ControlTip id={`sidebar-tip-rename-${item.id}`} tip={renameTip}>
                      <button
                        type="button"
                        aria-label={renameTip.title}
                        onClick={() => {
                          setEditingId(item.id)
                          setDraftName(item.sourceName)
                        }}
                        className="pressable min-h-11 w-full truncate rounded-lg px-1 text-left text-base font-medium text-slate-100"
                      >
                        {item.sourceName}
                      </button>
                    </ControlTip>
                  )}
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <ControlTip id={`sidebar-tip-switch-${item.id}`} tip={switchTip}>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={item.selected}
                        aria-label={switchTip.title}
                        onClick={() => onToggle(item.id)}
                        className="pressable relative h-11 w-14 shrink-0"
                      >
                        <span
                          aria-hidden="true"
                          className={`absolute left-1/2 top-1/2 h-6 w-11 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full ${
                            item.selected ? 'bg-accent-strong' : 'bg-white/15'
                          }`}
                        >
                          <span
                            className={`switch-knob absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.35)] ${
                              item.selected ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </span>
                      </button>
                    </ControlTip>
                    <ControlTip id={`sidebar-tip-colour-${item.id}`} tip={colourTip}>
                      <input
                        type="color"
                        aria-label={colourTip.title}
                        value={item.colour}
                        onChange={(event) => onColourChange(item.id, event.target.value.toLowerCase())}
                        className="h-11 w-11 shrink-0 cursor-pointer rounded-lg bg-surface-overlay p-1"
                      />
                    </ControlTip>
                    <ControlTip id={`sidebar-tip-export-${item.id}`} tip={exportTip}>
                      <button
                        type="button"
                        aria-label={exportTip.title}
                        onClick={() => onExport(item.id)}
                        className="pressable min-h-11 shrink-0 rounded-lg bg-surface-overlay px-3 text-sm text-slate-200 hover:bg-white/10"
                      >
                        Export
                      </button>
                    </ControlTip>
                    <ControlTip id={`sidebar-tip-delete-${item.id}`} tip={deleteTip}>
                      <button
                        type="button"
                        aria-label={deleteTip.title}
                        onClick={() => onDelete(item.id)}
                        className="pressable min-h-11 shrink-0 rounded-lg bg-surface-overlay px-3 text-sm text-red-400 hover:bg-white/10"
                      >
                        Delete
                      </button>
                    </ControlTip>
                  </div>
                  {exportNotes[item.id] && (
                    <p role="status" className="text-xs leading-relaxed text-amber-200">
                      {exportNotes[item.id]}
                    </p>
                  )}
                  {stats && verticesM.length > 0 && (
                    <div>
                      <ControlTip id={`sidebar-tip-extent-${item.id}`} tip={extentTip}>
                        <button
                          type="button"
                          aria-label={extentTip.title}
                          aria-expanded={figuresShown}
                          aria-controls={figuresId}
                          onClick={() =>
                            setFiguresOpen((current) => ({ ...current, [item.id]: !figuresShown }))
                          }
                          className="pressable flex min-h-11 w-full items-center justify-between gap-3 rounded-lg bg-surface-overlay px-3 text-sm text-slate-200 hover:bg-white/10"
                        >
                          {extentTip.title}
                          <Chevron open={figuresShown} />
                        </button>
                      </ControlTip>
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
                  {verticesM.length > 0 && (
                    <div>
                      <ControlTip id={`sidebar-tip-outline-${item.id}`} tip={outlineTip}>
                        <button
                          type="button"
                          aria-label={outlineTip.title}
                          aria-expanded={outlineShown}
                          aria-controls={outlineId}
                          onClick={() =>
                            setOutlineOpen((current) => ({ ...current, [item.id]: !outlineShown }))
                          }
                          className="pressable flex min-h-11 w-full items-center justify-between gap-3 rounded-lg bg-surface-overlay px-3 text-sm text-slate-200 hover:bg-white/10"
                        >
                          {outlineTip.title}
                          <Chevron open={outlineShown} />
                        </button>
                      </ControlTip>
                      {outlineShown && (
                        <div id={outlineId} className="mt-3">
                          <PolygonPreview
                            parts={previewParts}
                            colour={item.colour}
                            size={96}
                            className="w-24"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
