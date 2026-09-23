import { useCallback, useMemo, useRef, useState } from 'react'
import type { MapRef } from 'react-map-gl/maplibre'
import { computeStats } from './core/geometry'
import { parsePolygonFile, verticesToMetres } from './core/parseFile'
import { projectToGeographic } from './core/projection'
import { LengthUnit, LngLat, Vertex } from './core/types'
import { getBasemaps, hasMapTilerKey } from './map/basemap'
import MapView from './map/MapView'
import PolygonOverlay from './map/PolygonOverlay'
import { Region } from './map/regions'
import { downloadFramePng } from './map/snapshot'
import ImportPanel from './ui/ImportPanel'
import PolygonPreview from './ui/PolygonPreview'
import RegionSearch from './ui/RegionSearch'
import ScaleReadout from './ui/ScaleReadout'
import { SAMPLES } from './data/samples'

interface LoadedPolygon {
  raw: Vertex[]
  unit: LengthUnit
  sourceName: string
  hasZ: boolean
}

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
  const [loaded, setLoaded] = useState<LoadedPolygon | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [anchor, setAnchor] = useState<LngLat | null>(null)
  const [regionName, setRegionName] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const basemaps = useMemo(() => getBasemaps(MAPTILER_KEY), [])
  const [basemapId, setBasemapId] = useState(basemaps[0].id)
  const basemap = basemaps.find((b) => b.id === basemapId) ?? basemaps[0]

  const mapRef = useRef<MapRef>(null)
  const frameRef = useRef<HTMLDivElement>(null)

  const verticesM = useMemo<Vertex[]>(
    () => (loaded ? verticesToMetres(loaded.raw, unit) : []),
    [loaded, unit],
  )
  const stats = useMemo(
    () => (verticesM.length >= 3 ? computeStats(verticesM) : null),
    [verticesM],
  )
  const ring = useMemo<LngLat[]>(
    () => (anchor && verticesM.length >= 3 ? projectToGeographic(verticesM, anchor) : []),
    [anchor, verticesM],
  )
  const canExport = Boolean(stats && ring.length >= 3)

  const currentCenter = useCallback((): LngLat => {
    const c = mapRef.current?.getCenter()
    return c ? { lng: c.lng, lat: c.lat } : { lng: 0, lat: 20 }
  }, [])

  const handleImport = useCallback(
    (text: string, fileName: string) => {
      try {
        const result = parsePolygonFile(text)
        setLoaded({ raw: result.vertices, unit, sourceName: fileName, hasZ: result.hasZ })
        setError(null)
        setAnchor((prev) => prev ?? currentCenter())
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        setLoaded(null)
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
        setLoaded({ raw: result.vertices, unit: sample.unit, sourceName: sample.fileName, hasZ: result.hasZ })
        setError(null)
        setAnchor((prev) => prev ?? currentCenter())
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    },
    [currentCenter],
  )

  const handleSelectRegion = useCallback((region: Region) => {
    setRegionName(region.name)
    setAnchor({ lng: region.lng, lat: region.lat })
    mapRef.current?.flyTo({ center: [region.lng, region.lat], zoom: region.zoom, duration: 1200 })
  }, [])

  const handleSnapshot = useCallback(async () => {
    if (!frameRef.current || !canExport) return
    setExporting(true)
    setExportError(null)
    try {
      const name = regionName
        ? `scalefinder-${regionName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`
        : 'scalefinder-snapshot.png'
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
            ScaleFinder
          </h1>
          <p className="mt-0.5 text-xs text-slate-400">
            Superimpose a true-scale field polygon on a world map
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
              Import a polygon to export
            </p>
          )}
          {exportError && (
            <p id="export-error" role="alert" className="max-w-[14rem] text-right text-xs leading-snug text-red-400">
              {exportError}
            </p>
          )}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(12rem,42dvh)] overflow-hidden lg:grid-cols-[380px_minmax(0,1fr)] lg:grid-rows-1">
        <aside className="flex min-h-0 flex-col gap-8 overflow-y-auto overscroll-contain border-b border-white/10 bg-surface-raised px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 lg:border-b-0 lg:border-r">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-slate-100">1 · Import polygon</h2>
            <ImportPanel
              unit={unit}
              onUnitChange={setUnit}
              onImport={handleImport}
              onLoadSample={handleLoadSample}
              error={error}
              sourceName={loaded?.sourceName ?? null}
            />
          </section>

          {stats && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-slate-100">2 · Scale</h2>
              <div className="flex w-full flex-col gap-3">
                <ScaleReadout stats={stats} vertexCount={verticesM.length} hasZ={loaded?.hasZ ?? false} />
                <PolygonPreview points={verticesM} />
                {ring.length >= 3 && (
                  <p className="text-sm leading-relaxed text-slate-300">
                    Drag the marker on the map to reposition the polygon. It stays at true ground scale.
                  </p>
                )}
              </div>
            </section>
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

        <main className="relative min-h-0">
          <div ref={frameRef} className="absolute inset-0">
            <MapView ref={mapRef} basemap={basemap}>
              {anchor && (
                <PolygonOverlay ring={ring} anchor={anchor} onAnchorChange={setAnchor} />
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
                ScaleFinder
              </div>
            </div>

            {!stats && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                <p className="max-w-xs rounded-xl bg-surface/90 px-4 py-3 text-center text-sm leading-relaxed text-slate-100 shadow-[0_2px_8px_rgb(0_0_0/0.35)]">
                  Import a polygon to place it here at true ground scale.
                </p>
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
