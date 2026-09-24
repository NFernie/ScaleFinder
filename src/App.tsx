import { useCallback, useMemo, useRef, useState } from 'react'
import type { MapRef } from 'react-map-gl/maplibre'
import { centroid } from './core/geometry'
import { parsePolygonFile } from './core/parseFile'
import {
  downloadFileName,
  exportPolygonText,
  exportSelectedText,
  fixedAnchor,
  fixedName,
  parseUtmTable,
  ZONE_MESSAGE,
} from './core/polygonExport'
import {
  addCorner,
  applyDoubleClick,
  beginMeasurement,
  finishRuler,
  measuredPolygonDraft,
  Measurement,
} from './core/measurement'
import {
  appendPolygon,
  nextColour,
  PolygonItem,
  reCentreSelected,
  partsForPolygon,
  removePolygon,
  stackSelectedOn,
  verticesForPolygon,
} from './core/polygonList'
import { projectToGeographic } from './core/projection'
import { LengthUnit, LngLat } from './core/types'
import { getBasemaps, hasMapTilerKey } from './map/basemap'
import MapView from './map/MapView'
import MeasurementOverlay from './map/MeasurementOverlay'
import PolygonOverlay from './map/PolygonOverlay'
import { Region } from './map/regions'
import { downloadFramePng } from './map/snapshot'
import ImportPanel from './ui/ImportPanel'
import SidebarResizeHandle from './ui/SidebarResizeHandle'
import { MAP_MIN_PX, SIDEBAR_DEFAULT_PX } from './ui/sidebarWidth'
import MeasureMenu from './ui/MeasureMenu'
import PolygonList from './ui/PolygonList'
import RegionSearch from './ui/RegionSearch'
import { SAMPLES } from './data/samples'

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY

function Mark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      aria-hidden="true"
      className="shrink-0 text-accent"
    >
      <polygon
        points="2.5,14.5 6.5,3.5 15.5,7.5 12,15.5"
        fill="currentColor"
        fillOpacity="0.22"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function App() {
  const [unit, setUnit] = useState<LengthUnit>('m')
  const [items, setItems] = useState<PolygonItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loadedName, setLoadedName] = useState<string | null>(null)
  const [importNote, setImportNote] = useState<string | null>(null)
  const [exportNotes, setExportNotes] = useState<Record<string, string>>({})
  const [regionName, setRegionName] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [measurement, setMeasurement] = useState<Measurement | null>(null)
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_PX)

  const basemaps = useMemo(() => getBasemaps(MAPTILER_KEY), [])
  const [basemapId, setBasemapId] = useState(basemaps[0].id)
  const basemap = basemaps.find((b) => b.id === basemapId) ?? basemaps[0]

  const mapRef = useRef<MapRef>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const layoutRef = useRef<HTMLDivElement>(null)

  const canExport = items.some(
    (item) => item.selected && verticesForPolygon(item).length >= 3,
  )
  const anySelected = items.some((item) => item.selected)

  const currentCenter = useCallback((): LngLat => {
    const c = mapRef.current?.getCenter()
    return c ? { lng: c.lng, lat: c.lat } : { lng: 0, lat: 20 }
  }, [])

  const handleImport = useCallback(
    (text: string, fileName: string) => {
      try {
        const utm = parseUtmTable(text)
        if (utm) {
          if (utm.parts.length === 0) throw new Error('File contains no coordinate rows.')
          const flat = utm.parts.flat()
          setItems((prev) => {
            let next = appendPolygon(prev, {
              id: crypto.randomUUID(),
              sourceName: fileName,
              raw: flat,
              unit,
              hasZ: utm.hasZ,
              mapCentre: currentCenter(),
            })
            next = next.map((item, index) =>
              index === next.length - 1 ? { ...item, parts: utm.parts } : item,
            )
            if (utm.zone) {
              const anchor = fixedAnchor(utm.parts, utm.zone)
              next = appendPolygon(next, {
                id: crypto.randomUUID(),
                sourceName: fixedName(fileName),
                raw: flat,
                unit: 'm',
                hasZ: utm.hasZ,
                mapCentre: anchor,
              })
              next = next.map((item, index) =>
                index === next.length - 1
                  ? { ...item, parts: utm.parts, anchor, fixed: true }
                  : item,
              )
            }
            return next
          })
          setImportNote(utm.zone ? null : ZONE_MESSAGE)
          setError(null)
          setLoadedName(fileName)
          return
        }
        const result = parsePolygonFile(text)
        setItems((prev) =>
          appendPolygon(prev, {
            id: crypto.randomUUID(),
            sourceName: fileName,
            raw: result.vertices,
            unit,
            hasZ: result.hasZ,
            mapCentre: currentCenter(),
          }),
        )
        setImportNote(null)
        setError(null)
        setLoadedName(fileName)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    },
    [unit, currentCenter],
  )

  const handleLoadSample = useCallback(
    (id: string) => {
      const sample = SAMPLES[id]
      if (!sample) return
      setUnit(sample.unit)
      try {
        const result = parsePolygonFile(sample.text)
        setItems((prev) =>
          appendPolygon(prev, {
            id: crypto.randomUUID(),
            sourceName: sample.fileName,
            raw: result.vertices,
            unit: sample.unit,
            hasZ: result.hasZ,
            mapCentre: currentCenter(),
          }),
        )
        setError(null)
        setLoadedName(sample.fileName)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    },
    [currentCenter],
  )

  const handleSelectRegion = useCallback((region: Region) => {
    setRegionName(region.name)
    setItems((prev) => stackSelectedOn(prev, { lng: region.lng, lat: region.lat }))
    mapRef.current?.flyTo({ center: [region.lng, region.lat], zoom: region.zoom, duration: 1200 })
  }, [])

  const handleToggle = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item)),
    )
  }, [])

  const handleColourChange = useCallback((id: string, colour: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, colour } : item)))
  }, [])

  const handleReCentre = useCallback(() => {
    setItems((prev) => reCentreSelected(prev))
  }, [])

  const handleDelete = useCallback((id: string) => {
    setItems((prev) => removePolygon(prev, id))
  }, [])

  const handleRename = useCallback((id: string, name: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, sourceName: name } : item)))
  }, [])

  const geographicParts = useCallback((item: PolygonItem) => {
    const parts = partsForPolygon(item)
    const origin = centroid(parts.flat())
    return parts.map((part) => projectToGeographic(part, item.anchor, origin))
  }, [])

  const saveCsv = useCallback((fileName: string, text: string) => {
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
  }, [])

  const handleExportPolygon = useCallback(
    (id: string) => {
      const item = items.find((entry) => entry.id === id)
      if (!item) return
      const result = exportPolygonText(geographicParts(item), item.anchor)
      if (!result.ok) {
        setExportNotes((prev) => ({ ...prev, [id]: result.message }))
        return
      }
      setExportNotes((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      saveCsv(downloadFileName(item.sourceName), result.text)
    },
    [items, geographicParts, saveCsv],
  )

  const handleExportSelected = useCallback(() => {
    const selected = items.filter((item) => item.selected)
    const result = exportSelectedText(
      selected.map((item) => ({
        id: item.id,
        parts: geographicParts(item),
        anchor: item.anchor,
      })),
    )
    if (!result.ok) {
      if (result.id) setExportNotes((prev) => ({ ...prev, [result.id]: result.message }))
      return
    }
    setExportNotes((prev) => {
      const next = { ...prev }
      for (const item of selected) delete next[item.id]
      for (const omitted of result.omitted) next[omitted.id] = omitted.message
      return next
    })
    const first = selected.find((item) => !result.omitted.some((omitted) => omitted.id === item.id))
    saveCsv(downloadFileName(first?.sourceName ?? 'polygons'), result.text)
  }, [items, geographicParts, saveCsv])

  const handleAnchorChange = useCallback((id: string, next: LngLat) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, anchor: next } : item)))
  }, [])

  const handleMeasure = useCallback(() => {
    setMeasurement((current) => current ?? beginMeasurement())
  }, [])

  const handleMapClick = useCallback((event: { lngLat: { lng: number; lat: number }; originalEvent: { target: EventTarget | null } }) => {
    const target = event.originalEvent.target
    if (target instanceof Element && target.closest('.maplibregl-marker')) return
    const corner = { lng: event.lngLat.lng, lat: event.lngLat.lat }
    setMeasurement((current) => (current ? addCorner(current, corner) : current))
  }, [])

  const handleMapDoubleClick = useCallback((event: { lngLat: { lng: number; lat: number } }) => {
    const corner = { lng: event.lngLat.lng, lat: event.lngLat.lat }
    setMeasurement((current) => (current ? applyDoubleClick(current, corner) : current))
  }, [])

  const handleMeasureDone = useCallback(() => {
    setMeasurement((current) => (current ? finishRuler(current) : current))
  }, [])

  const handleMeasureDelete = useCallback(() => {
    setMeasurement(null)
  }, [])

  const handleMeasureAdd = useCallback(() => {
    setMeasurement((current) => {
      if (!current) return current
      const draft = measuredPolygonDraft(current)
      if (!draft) return current
      setItems((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sourceName: draft.sourceName,
          raw: draft.raw,
          unit: draft.unit,
          hasZ: draft.hasZ,
          selected: true,
          anchor: draft.anchor,
          colour: nextColour(prev.map((item) => item.colour)),
        },
      ])
      return null
    })
  }, [])

  const handleSnapshot = useCallback(async () => {
    if (!frameRef.current || !canExport) return
    setExporting(true)
    setExportError(null)
    try {
      const name = regionName
        ? `scalefindr-${regionName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`
        : 'scalefindr-snapshot.png'
      await downloadFramePng(frameRef.current, name)
    } catch {
      setExportError('The snapshot could not be saved. Try again.')
    } finally {
      setExporting(false)
    }
  }, [regionName, canExport])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-white/10 pb-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:pl-[max(1.25rem,env(safe-area-inset-left))] sm:pr-[max(1.25rem,env(safe-area-inset-right))]">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Mark />
            ScaleFindr
          </h1>
          <p className="mt-0.5 text-xs text-slate-400">
            Superimpose a true-scale field Polygon on a world map
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={() => void handleSnapshot()}
            disabled={!canExport || exporting}
            aria-busy={exporting}
            aria-describedby={!canExport ? 'export-hint' : exportError ? 'export-error' : undefined}
            className="pressable min-h-11 shrink-0 rounded-lg bg-accent px-4 text-sm font-semibold text-teal-950 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {exporting ? 'Exporting…' : 'Export snapshot (PNG)'}
          </button>
          {!canExport && (
            <p id="export-hint" className="max-w-[14rem] text-right text-xs leading-snug text-slate-400">
              {items.length === 0 ? 'Import a Polygon to export' : 'Switch a Polygon on to export'}
            </p>
          )}
          {exportError && (
            <p id="export-error" role="alert" className="max-w-[14rem] text-right text-xs leading-snug text-red-400">
              {exportError}
            </p>
          )}
        </div>
      </header>

      <div
        ref={layoutRef}
        className="relative grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(12rem,42dvh)] overflow-hidden lg:grid-cols-[var(--sidebar-width)_minmax(0,1fr)] lg:grid-rows-1"
        style={{ ['--sidebar-width' as string]: `${sidebarWidth}px` }}
      >
        <aside className="relative flex min-h-0 flex-col gap-8 overflow-y-auto overscroll-contain border-b border-white/10 bg-surface-raised px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 lg:border-b-0 lg:border-r">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-slate-100">1 · Import Polygon</h2>
            <ImportPanel
              unit={unit}
              onUnitChange={setUnit}
              onImport={handleImport}
              onLoadSample={handleLoadSample}
              error={error}
              sourceName={loadedName}
            />
            {importNote && (
              <p role="status" className="mt-3 text-xs leading-relaxed text-amber-200">
                {importNote}
              </p>
            )}
          </section>

          {items.length > 0 && (
            <PolygonList
              items={items}
              onToggle={handleToggle}
              onColourChange={handleColourChange}
              onReCentre={handleReCentre}
              onDelete={handleDelete}
              onRename={handleRename}
              onExport={handleExportPolygon}
              onExportSelected={handleExportSelected}
              exportNotes={exportNotes}
            />
          )}

          <section>
            <h2 className="mb-3 text-sm font-semibold text-slate-100">3 · Find a region</h2>
            <RegionSearch
              mapTilerKey={MAPTILER_KEY}
              selectedName={regionName}
              onSelect={handleSelectRegion}
            />
          </section>

          {!hasMapTilerKey(MAPTILER_KEY) && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">
              Using the keyless OpenFreeMap basemap. Set <span className="font-mono">VITE_MAPTILER_KEY</span>{' '}
              to enable MapTiler basemaps and worldwide search.
            </p>
          )}
        </aside>
        <SidebarResizeHandle
          width={sidebarWidth}
          containerWidth={() => layoutRef.current?.clientWidth || sidebarWidth + MAP_MIN_PX}
          onWidth={setSidebarWidth}
        />

        <main className="relative min-h-0">
          <div ref={frameRef} className="absolute inset-0">
            <MapView
              ref={mapRef}
              basemap={basemap}
              onMapClick={measurement?.status === 'adding' ? handleMapClick : undefined}
              onMapDoubleClick={measurement ? handleMapDoubleClick : undefined}
              doubleClickZoom={measurement?.status !== 'adding'}
            >
              {items.map((item) => {
                if (!item.selected) return null
                const parts = partsForPolygon(item)
                const origin = centroid(parts.flat())
                const rings = parts.map((part) => projectToGeographic(part, item.anchor, origin))
                return (
                  <PolygonOverlay
                    key={item.id}
                    id={item.id}
                    rings={rings}
                    fixed={item.fixed}
                    anchor={item.anchor}
                    colour={item.colour}
                    sourceName={item.sourceName}
                    onAnchorChange={(next) => handleAnchorChange(item.id, next)}
                  />
                )
              })}
              {measurement && (
                <MeasurementOverlay
                  corners={measurement.corners}
                  closed={measurement.status === 'polygon'}
                />
              )}
            </MapView>

            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 pr-14">
              {regionName ? (
                <div className="max-w-[min(100%,18rem)] rounded-lg bg-surface/90 px-3 py-1.5 text-sm font-medium leading-snug text-white shadow-[0_2px_8px_rgb(0_0_0/0.35)]">
                  {regionName}
                </div>
              ) : (
                <span />
              )}
              <div className="shrink-0 rounded-lg bg-surface/90 px-2.5 py-1.5 text-xs font-medium text-slate-100 shadow-[0_2px_8px_rgb(0_0_0/0.35)]">
                ScaleFindr
              </div>
            </div>

            {!anySelected && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                <p className="max-w-xs rounded-xl bg-surface/90 px-4 py-3 text-center text-sm leading-relaxed text-slate-100 shadow-[0_2px_8px_rgb(0_0_0/0.35)]">
                  {items.length === 0
                    ? 'Import a Polygon to place it here at true ground scale.'
                    : 'Switch a Polygon on to show it here.'}
                </p>
              </div>
            )}
          </div>

          <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-h-[calc(100%-1.5rem)] w-[min(18rem,calc(100%-5.5rem))] flex-col items-start gap-2">
            <button
              type="button"
              aria-pressed={measurement !== null}
              onClick={handleMeasure}
              className={`pressable pointer-events-auto min-h-11 rounded-lg border px-3 text-sm font-medium shadow-[0_2px_8px_rgb(0_0_0/0.35)] ${
                measurement
                  ? 'border-accent bg-accent-strong text-teal-50'
                  : 'border-white/15 bg-surface/95 text-white'
              }`}
            >
              Measure
            </button>
            {measurement && (
              <div className="pointer-events-auto min-h-0 w-full">
                <MeasureMenu
                  measurement={measurement}
                  onDone={handleMeasureDone}
                  onDelete={handleMeasureDelete}
                  onAdd={handleMeasureAdd}
                />
              </div>
            )}
          </div>

          <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2">
            <label className="sr-only" htmlFor="basemap-select">
              Basemap
            </label>
            <select
              id="basemap-select"
              value={basemapId}
              onChange={(e) => setBasemapId(e.target.value)}
              className="pointer-events-auto min-h-11 rounded-lg border border-white/15 bg-surface/95 px-3 text-base text-white shadow-[0_2px_8px_rgb(0_0_0/0.35)]"
            >
              {basemaps.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
        </main>
      </div>
    </div>
  )
}
