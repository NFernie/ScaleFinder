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

export default function App() {
  const [unit, setUnit] = useState<LengthUnit>('m')
  const [loaded, setLoaded] = useState<LoadedPolygon | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [anchor, setAnchor] = useState<LngLat | null>(null)
  const [regionName, setRegionName] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

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
    if (!frameRef.current) return
    setExporting(true)
    try {
      const name = regionName
        ? `scalefinder-${regionName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`
        : 'scalefinder-snapshot.png'
      await downloadFramePng(frameRef.current, name)
    } finally {
      setExporting(false)
    }
  }, [regionName])

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            <span className="text-accent">▰</span> ScaleFinder
          </h1>
          <p className="text-xs text-slate-400">
            Superimpose a true-scale field polygon on a world map
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleSnapshot()}
          disabled={!stats || ring.length < 3 || exporting}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-teal-950 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {exporting ? 'Exporting…' : 'Export snapshot (PNG)'}
        </button>
      </header>

      <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[380px_1fr]">
        <aside className="space-y-6 overflow-y-auto border-r border-white/10 bg-surface-raised p-5">
          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-200">1 · Import polygon</h2>
            <ImportPanel
              unit={unit}
              onUnitChange={setUnit}
              onImport={handleImport}
              onLoadSample={handleLoadSample}
              error={error}
              sourceName={loaded?.sourceName ?? null}
            />
          </div>

          {stats && (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-slate-200">2 · Scale</h2>
              <div className="flex flex-col items-start gap-3">
                <ScaleReadout stats={stats} vertexCount={verticesM.length} hasZ={loaded?.hasZ ?? false} />
                <PolygonPreview points={verticesM} />
              </div>
            </div>
          )}

          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-200">3 · Find a region</h2>
            <RegionSearch mapTilerKey={MAPTILER_KEY} onSelect={handleSelectRegion} />
            {stats && ring.length >= 3 && (
              <p className="mt-3 text-xs text-slate-400">
                Drag the marker on the map to reposition the polygon. It stays at true ground scale.
              </p>
            )}
          </div>

          {!hasMapTilerKey(MAPTILER_KEY) && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              Using the keyless OpenFreeMap basemap. Set <span className="font-mono">VITE_MAPTILER_KEY</span>{' '}
              to enable MapTiler basemaps and worldwide search.
            </p>
          )}
        </aside>

        <main className="relative">
          <div ref={frameRef} className="relative h-full w-full">
            <MapView ref={mapRef} basemap={basemap}>
              {anchor && (
                <PolygonOverlay ring={ring} anchor={anchor} onAnchorChange={setAnchor} />
              )}
            </MapView>

            {regionName && (
              <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-black/60 px-3 py-1.5 text-sm font-medium text-white backdrop-blur">
                {regionName}
              </div>
            )}
            <div className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-white/70">
              ScaleFinder
            </div>
          </div>

          <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2">
            <label className="sr-only" htmlFor="basemap-select">
              Basemap
            </label>
            <select
              id="basemap-select"
              value={basemapId}
              onChange={(e) => setBasemapId(e.target.value)}
              className="pointer-events-auto rounded-lg border border-white/15 bg-black/60 px-2 py-1 text-xs text-white backdrop-blur"
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
