import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { MapRef } from 'react-map-gl/maplibre'
import { edgePanDelta } from './map/mapEdgePan'
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
import { circleRadiusM, circleRing } from './core/circle'
import { polygonAreaM2 } from './core/geometry'
import { haversineM } from './core/projection'
import { ringToDraft } from './core/ringDraft'
import { squareCorners } from './core/square'
import {
  CANNOT_SAMPLE,
  lockReference,
  referenceFromRaster,
  traceBrush,
  type LassoSample,
  type Raster,
  type Rgb,
} from './core/lasso'
import {
  acceptClick,
  acceptDoubleClick,
  acceptHover,
  closedSession,
  chooseTool,
  doneDraft,
  dropLastLassoPoint,
  noteLasso,
  overlayOf,
  paintLassoSample,
  setLassoOutline,
  setLassoSettings,
  setSessionLassoBehaviour,
  setSquareMode,
  takeDraft,
  takeLassoPair,
  toggleMenu,
  ToolboxSession,
} from './core/toolboxSession'
import {
  appendPolygon,
  centreSelectedOnFixed,
  nextColour,
  PolygonItem,
  reCentreSelected,
  partsForPolygon,
  removePolygon,
  stackSelectedOn,
  verticesForPolygon,
} from './core/polygonList'
import { projectToGeographic } from './core/projection'
import {
  bearingDelta,
  initialBearing,
  rotationForBearing,
  rotationState,
  turnedParts,
  wrapBearing,
} from './core/rotation'
import { LengthUnit, LngLat } from './core/types'
import { getBasemaps, hasMapTilerKey } from './map/basemap'
import { bufferPixel, bufferToCss, radiusInBuffer, readBasemap, sampleBasemap } from './map/sampleCanvas'
import MapToolCursor from './map/MapToolCursor'
import { framePointerFromClient } from './map/toolCursor'
import MapView from './map/MapView'
import MeasurementOverlay from './map/MeasurementOverlay'
import PlacedPolygon from './map/PlacedPolygon'
import { Region } from './map/regions'
import { downloadFramePng } from './map/snapshot'
import ImportPanel from './ui/ImportPanel'
import LassoMenu from './ui/LassoMenu'
import SidebarResizeHandle from './ui/SidebarResizeHandle'
import { MAP_MIN_PX, SIDEBAR_DEFAULT_PX } from './ui/sidebarWidth'
import MeasureMenu from './ui/MeasureMenu'
import RulerMenu from './ui/RulerMenu'
import ShapeMenu from './ui/ShapeMenu'
import PolygonList from './ui/PolygonList'
import Toolbox from './ui/Toolbox'
import RegionSearch from './ui/RegionSearch'
import { SAMPLES } from './data/samples'

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY
const BRUSH_GAP_PX = 8

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

function stampRotation(item: PolygonItem): PolygonItem {
  if (item.fixed) return item
  const state = rotationState(partsForPolygon(item), item.anchor)
  return state ? { ...item, ...state } : item
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
  const [session, setSession] = useState<ToolboxSession>(closedSession())
  const [toolPointer, setToolPointer] = useState<{ x: number; y: number } | null>(null)
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_PX)

  const basemaps = useMemo(() => getBasemaps(MAPTILER_KEY), [])
  const [basemapId, setBasemapId] = useState(basemaps[0].id)
  const basemap = basemaps.find((b) => b.id === basemapId) ?? basemaps[0]

  const mapRef = useRef<MapRef>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const lassoChain = useRef(Promise.resolve())
  const lassoRaster = useRef<Raster | null>(null)
  const lassoSawRaster = useRef(false)
  const lastCss = useRef<{ x: number; y: number } | null>(null)
  const appendedOnLastDown = useRef(false)
  const lassoPressSampled = useRef(false)
  const touchAt = useRef(0)
  const painting = useRef(false)
  const lassoDrawing = useRef(false)
  const lassoOutline = useRef(false)
  const guideCount = useRef(0)
  const layoutRef = useRef<HTMLDivElement>(null)
  const lastFramePointerClient = useRef<{ x: number; y: number } | null>(null)

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
              index === next.length - 1 ? stampRotation({ ...item, parts: utm.parts }) : item,
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
          }).map((item, index, all) => (index === all.length - 1 ? stampRotation(item) : item)),
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
          }).map((item, index, all) => (index === all.length - 1 ? stampRotation(item) : item)),
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
    setItems((prev) =>
      reCentreSelected(prev).map((item) => {
        if (!item.selected || item.fixed || !item.referenceEdge || item.originalBearing == null) return item
        const rotationDeg = rotationForBearing(
          partsForPolygon(item),
          item.anchor,
          item.rotationDeg ?? 0,
          item.referenceEdge,
          item.originalBearing,
        )
        return { ...item, rotationDeg }
      }),
    )
  }, [])

  const handleCentreOnFixed = useCallback(
    (fixedId: string) => {
      const next = centreSelectedOnFixed(items, fixedId)
      if (next === items) return
      const fixed = items.find((item) => item.id === fixedId && item.fixed)
      setItems(next)
      if (!fixed || !mapRef.current) return
      mapRef.current.flyTo({
        center: [fixed.anchor.lng, fixed.anchor.lat],
        zoom: mapRef.current.getZoom(),
        duration: 1200,
      })
    },
    [items],
  )

  const handleRemovePolygon = useCallback((id: string) => {
    setItems((prev) => removePolygon(prev, id))
  }, [])

  const handleRename = useCallback((id: string, name: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, sourceName: name } : item)))
  }, [])

  const geographicParts = useCallback((item: PolygonItem) => {
    const parts = turnedParts(partsForPolygon(item), item.fixed ? 0 : item.rotationDeg ?? 0)
    const origin = centroid(parts.flat())
    return parts.map((part) => projectToGeographic(part, item.anchor, origin))
  }, [])

  const handleBearing = useCallback((id: string, bearing: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id || item.fixed || !item.referenceEdge) return item
        const rotationDeg = rotationForBearing(
          partsForPolygon(item),
          item.anchor,
          item.rotationDeg ?? 0,
          item.referenceEdge,
          bearing,
        )
        return { ...item, rotationDeg }
      }),
    )
  }, [])

  const handleRotatePointer = useCallback((id: string, pointer: LngLat) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id || item.fixed || !item.referenceEdge) return item
        const rings = geographicParts(item)
        const ring = rings[item.referenceEdge.part]
        const start = ring?.[item.referenceEdge.edge]
        const end = ring?.[item.referenceEdge.edge + 1]
        if (!start || !end) return item
        const mid = { lng: (start.lng + end.lng) / 2, lat: (start.lat + end.lat) / 2 }
        const rotationDeg = wrapBearing(
          (item.rotationDeg ?? 0) + bearingDelta(initialBearing(item.anchor, mid), initialBearing(item.anchor, pointer)),
        )
        return { ...item, rotationDeg }
      }),
    )
  }, [geographicParts])

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

  lassoDrawing.current = session.lasso?.status === 'drawing'
  lassoOutline.current = session.lasso?.behaviour === 'outline'
  if (!session.lasso) guideCount.current = 0
  else if (session.lasso.guide.length >= guideCount.current) guideCount.current = session.lasso.guide.length
  const mapAcceptsPoints =
    session.polygon?.status === 'adding' ||
    session.ruler?.status === 'adding' ||
    session.circle?.status === 'centre' ||
    session.square?.status === 'origin' ||
    lassoDrawing.current

  const resetLassoScratch = useCallback(() => {
    lassoSawRaster.current = false
    lassoRaster.current = null
    lastCss.current = null
    appendedOnLastDown.current = false
    lassoPressSampled.current = false
    painting.current = false
    guideCount.current = 0
  }, [])

  const colourParts = useCallback((samples: LassoSample[], reference: Rgb | null) => {
    const map = mapRef.current && 'getMap' in mapRef.current ? mapRef.current.getMap() : null
    const raster = lassoRaster.current
    if (!map || !raster) return null
    const canvas = map.getCanvas()
    const ready = samples.flatMap((sample) =>
      sample.pixel
        ? [
            {
              pixel: sample.pixel,
              radiusPx: radiusInBuffer(sample.radiusPx, raster.width, canvas.clientWidth),
              maxChannelDelta: sample.maxChannelDelta,
            },
          ]
        : [],
    )
    const rings = traceBrush(raster, ready, reference)
    if (!rings) return []
    return rings.map((ring) =>
      ring.map((pixel) => {
        const css = bufferToCss(pixel, raster.width, raster.height, canvas.clientWidth, canvas.clientHeight)
        const lngLat = map.unproject([css.x, css.y])
        return { lng: lngLat.lng, lat: lngLat.lat }
      }),
    )
  }, [])

  const paintLasso = useCallback(
    async (index: number, css: { x: number; y: number }) => {
      const map = mapRef.current && 'getMap' in mapRef.current ? mapRef.current.getMap() : null
      if (!map) {
        setSession((current) => noteLasso(current, CANNOT_SAMPLE))
        return
      }
      try {
        const raster = lassoSawRaster.current ? readBasemap(map) : await sampleBasemap(map)
        lassoSawRaster.current = true
        lassoRaster.current = raster
        const canvas = map.getCanvas()
        const pixel = bufferPixel(css.x, css.y, raster.width, raster.height, canvas.clientWidth, canvas.clientHeight)
        setSession((current) => {
          if (!current.lasso || current.lasso.status !== 'drawing') return current
          let painted = paintLassoSample(current, index, pixel)
          if (
            painted.lasso?.behaviour === 'static' &&
            index === 0 &&
            painted.lasso.reference === null
          ) {
            const colour = referenceFromRaster(raster, pixel)
            if (colour && painted.lasso) {
              painted = { ...painted, lasso: lockReference(painted.lasso, colour) }
            }
          }
          const parts = painted.lasso ? colourParts(painted.lasso.samples, painted.lasso.reference) : null
          if (!painted.lasso || !parts) return painted
          return setLassoOutline(painted, parts)
        })
      } catch {
        setSession((current) => noteLasso(current, CANNOT_SAMPLE))
      }
    },
    [colourParts],
  )

  const queueGuidePoint = useCallback(
    (corner: LngLat, css: { x: number; y: number } | undefined, fromPress: boolean) => {
      if (!lassoDrawing.current) return
      if (!fromPress && css && lastCss.current) {
        const dx = css.x - lastCss.current.x
        const dy = css.y - lastCss.current.y
        if (dx * dx + dy * dy < BRUSH_GAP_PX * BRUSH_GAP_PX) return
      }
      const index = guideCount.current
      guideCount.current += 1
      setSession((current) => {
        if (current.lasso?.status !== 'drawing') return current
        return acceptClick(current, corner).session
      })
      if (fromPress) appendedOnLastDown.current = true
      if (css) lastCss.current = css
      if (lassoOutline.current) return
      const point = css ?? { x: 0, y: 0 }
      lassoChain.current = lassoChain.current.then(() => paintLasso(index, point))
    },
    [paintLasso],
  )

  const handleMapClick = useCallback(
    (event: {
      lngLat: { lng: number; lat: number }
      point?: { x: number; y: number }
      originalEvent: { target: EventTarget | null }
    }) => {
      const target = event.originalEvent.target
      if (target instanceof Element && target.closest('.maplibregl-marker')) return
      const corner = { lng: event.lngLat.lng, lat: event.lngLat.lat }
      if (lassoPressSampled.current) {
        lassoPressSampled.current = false
        return
      }
      if (lassoDrawing.current) {
        queueGuidePoint(corner, event.point, true)
        return
      }
      setSession((current) => acceptClick(current, corner).session)
    },
    [queueGuidePoint],
  )

  const handleMapDoubleClick = useCallback(
    (event: { lngLat: { lng: number; lat: number } }) => {
      const corner = { lng: event.lngLat.lng, lat: event.lngLat.lat }
      if (!lassoDrawing.current) {
        setSession((current) => acceptDoubleClick(current, corner))
        return
      }
      lassoChain.current = lassoChain.current.then(() => {
        setSession((current) => {
          if (current.lasso?.status !== 'drawing') return current
          let next = current
          if (appendedOnLastDown.current) {
            next = dropLastLassoPoint(next)
            appendedOnLastDown.current = false
            guideCount.current = Math.max(0, guideCount.current - 1)
            if (next.lasso?.behaviour !== 'outline') {
              const parts = next.lasso ? colourParts(next.lasso.samples, next.lasso.reference) : null
              if (parts) next = setLassoOutline(next, parts)
            }
          }
          return acceptDoubleClick(next, corner)
        })
      })
    },
    [colourParts],
  )

  const handleMapMouseDown = useCallback(
    (event: {
      lngLat: { lng: number; lat: number }
      point: { x: number; y: number }
      originalEvent: { target: EventTarget | null }
    }) => {
      if (!lassoDrawing.current || Date.now() - touchAt.current < 700) return
      const target = event.originalEvent.target
      if (target instanceof Element && target.closest('.maplibregl-marker')) return
      painting.current = true
      lassoPressSampled.current = true
      queueGuidePoint({ lng: event.lngLat.lng, lat: event.lngLat.lat }, event.point, true)
    },
    [queueGuidePoint],
  )

  const handleMapMouseUp = useCallback(() => {
    painting.current = false
  }, [])

  const handleMapTouchStart = useCallback(
    (event: {
      lngLat: { lng: number; lat: number }
      point: { x: number; y: number }
      originalEvent: { target: EventTarget | null }
    }) => {
      touchAt.current = Date.now()
      if (!lassoDrawing.current) return
      const target = event.originalEvent.target
      if (target instanceof Element && target.closest('.maplibregl-marker')) return
      painting.current = true
      lassoPressSampled.current = true
      queueGuidePoint({ lng: event.lngLat.lng, lat: event.lngLat.lat }, event.point, true)
    },
    [queueGuidePoint],
  )

  const panMapEdge = useCallback(
    (point: { x: number; y: number } | undefined) => {
      if (!mapAcceptsPoints || !point) return
      const map = mapRef.current && 'getMap' in mapRef.current ? mapRef.current.getMap() : null
      if (!map) return
      const canvas = map.getCanvas()
      const delta = edgePanDelta(
        point,
        { width: canvas.clientWidth, height: canvas.clientHeight },
        32,
      )
      if (delta.x !== 0 || delta.y !== 0) {
        map.panBy([delta.x, delta.y], { duration: 0 })
      }
    },
    [mapAcceptsPoints],
  )

  const handleMapTouchMove = useCallback(
    (event: { lngLat: { lng: number; lat: number }; point: { x: number; y: number } }) => {
      if (painting.current && lassoDrawing.current) {
        queueGuidePoint({ lng: event.lngLat.lng, lat: event.lngLat.lat }, event.point, false)
      }
      panMapEdge(event.point)
    },
    [panMapEdge, queueGuidePoint],
  )

  const handleMapMouseMove = useCallback(
    (event: {
      lngLat: { lng: number; lat: number }
      point?: { x: number; y: number }
      originalEvent?: { buttons?: number }
    }) => {
      const buttons = event.originalEvent?.buttons
      if (
        painting.current &&
        lassoDrawing.current &&
        event.point &&
        (buttons === undefined || buttons === 1)
      ) {
        queueGuidePoint({ lng: event.lngLat.lng, lat: event.lngLat.lat }, event.point, false)
      }
      panMapEdge(event.point)
      const corner = { lng: event.lngLat.lng, lat: event.lngLat.lat }
      setSession((current) => acceptHover(current, corner))
    },
    [panMapEdge, queueGuidePoint],
  )

  const handleDone = useCallback(() => {
    setSession((current) => doneDraft(current))
  }, [])

  const handleDelete = useCallback(() => {
    resetLassoScratch()
    setToolPointer(null)
    setSession(closedSession())
  }, [resetLassoScratch])

  const syncToolPointer = useCallback((clientX: number, clientY: number) => {
    const frame = frameRef.current
    if (!frame) return
    const pos = framePointerFromClient(frame.getBoundingClientRect(), clientX, clientY)
    setToolPointer(pos)
  }, [])

  const handleFramePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      lastFramePointerClient.current = { x: event.clientX, y: event.clientY }
      if (session.tool) {
        syncToolPointer(event.clientX, event.clientY)
      }
    },
    [session.tool, syncToolPointer],
  )

  const handleFramePointerLeave = useCallback(() => {
    lastFramePointerClient.current = null
    setToolPointer(null)
  }, [])

  useEffect(() => {
    if (!session.tool) {
      setToolPointer(null)
      return
    }
    const last = lastFramePointerClient.current
    if (last) {
      syncToolPointer(last.x, last.y)
    }
  }, [session.tool, syncToolPointer])

  const handleAdd = useCallback(() => {
    setSession((current) => {
      if (current.lasso) {
        const pairId = crypto.randomUUID()
        const taken = takeLassoPair(current, pairId)
        if (!taken.movable || !taken.fixed) return current
        const movableDraft = taken.movable
        const fixedDraft = taken.fixed
        setItems((prev) => {
          const colour = nextColour(prev.map((item) => item.colour))
          const movable = stampRotation({
            id: crypto.randomUUID(),
            sourceName: movableDraft.sourceName,
            raw: movableDraft.raw,
            parts: movableDraft.parts,
            unit: movableDraft.unit,
            hasZ: movableDraft.hasZ,
            selected: true,
            anchor: movableDraft.anchor,
            colour,
            pairId,
          })
          const fixed = stampRotation({
            id: crypto.randomUUID(),
            sourceName: fixedDraft.sourceName,
            raw: fixedDraft.raw,
            parts: fixedDraft.parts,
            unit: fixedDraft.unit,
            hasZ: fixedDraft.hasZ,
            selected: true,
            anchor: fixedDraft.anchor,
            colour,
            pairId,
            fixed: true,
          })
          return [...prev, movable, fixed]
        })
        resetLassoScratch()
        return taken.session
      }
      const taken = takeDraft(current)
      if (!taken.draft) return current
      const draft = taken.draft
      setItems((prev) => [
        ...prev,
        stampRotation({
          id: crypto.randomUUID(),
          sourceName: draft.sourceName,
          raw: draft.raw,
          unit: draft.unit,
          hasZ: draft.hasZ,
          selected: true,
          anchor: draft.anchor,
          colour: nextColour(prev.map((item) => item.colour)),
        }),
      ])
      return taken.session
    })
  }, [resetLassoScratch])

  const measurementOverlay = overlayOf(session)
  const shapeCanAdd = takeDraft(session).draft !== null

  const circleLengthM =
    session.circle?.status === 'ready' && session.circle.centre && session.circle.edge
      ? circleRadiusM(session.circle.centre, session.circle.edge)
      : null
  const circleAreaM2 = (() => {
    if (!session.circle?.centre || circleLengthM === null) return null
    const draft = ringToDraft(circleRing(session.circle.centre, circleLengthM), 'Circle')
    return draft ? polygonAreaM2(draft.raw) : null
  })()

  const squareRing =
    session.square?.status === 'ready' && session.square.origin && session.square.opposite
      ? squareCorners(session.square.origin, session.square.opposite, session.square.shape)
      : null
  const squareLengthM =
    squareRing && squareRing.length >= 4
      ? Math.max(haversineM(squareRing[0], squareRing[1]), haversineM(squareRing[0], squareRing[3]))
      : null
  const squareAreaM2 = (() => {
    if (!squareRing) return null
    const name = session.square?.shape === 'square' ? 'Square' : 'Rectangle'
    const draft = ringToDraft(squareRing, name)
    return draft ? polygonAreaM2(draft.raw) : null
  })()

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
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-surface-raised pb-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:pl-[max(1.25rem,env(safe-area-inset-left))] sm:pr-[max(1.25rem,env(safe-area-inset-right))]">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-lg font-semibold">
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
        <aside className="relative flex min-h-0 flex-col gap-8 overflow-y-auto overscroll-contain bg-surface-raised px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 lg:px-6">
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
              onDelete={handleRemovePolygon}
              onRename={handleRename}
              onBearing={handleBearing}
              onExport={handleExportPolygon}
              onExportSelected={handleExportSelected}
              onCentreOnFixed={handleCentreOnFixed}
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
            <p className="rounded-lg bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">
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
          <div
            ref={frameRef}
            className={`absolute inset-0 ${session.tool ? 'cursor-none' : ''}`}
            onPointerMove={handleFramePointerMove}
            onPointerLeave={handleFramePointerLeave}
          >
            <MapView
              ref={mapRef}
              basemap={basemap}
              onMapClick={mapAcceptsPoints ? handleMapClick : undefined}
              onMapDoubleClick={session.polygon || session.ruler || session.lasso ? handleMapDoubleClick : undefined}
              onMapMouseMove={handleMapMouseMove}
              onMapMouseDown={handleMapMouseDown}
              onMapMouseUp={handleMapMouseUp}
              onMapTouchStart={handleMapTouchStart}
              onMapTouchMove={handleMapTouchMove}
              doubleClickZoom={!mapAcceptsPoints}
              dragPan={session.lasso?.status !== 'drawing'}
              hideNativeCursor={session.tool !== null}
            >
              {items.map((item) =>
                item.selected ? (
                  <PlacedPolygon
                    key={item.id}
                    item={item}
                    onAnchorChange={(next) => handleAnchorChange(item.id, next)}
                    onRotate={(pointer) => handleRotatePointer(item.id, pointer)}
                  />
                ) : null,
              )}
              {(measurementOverlay.corners.length > 0 ||
                session.polygon ||
                session.ruler ||
                session.lasso ||
                session.circle ||
                session.square) && (
                <MeasurementOverlay
                  corners={measurementOverlay.corners}
                  closed={measurementOverlay.closed}
                  preview={measurementOverlay.preview}
                  guide={measurementOverlay.guide}
                  guideClosed={measurementOverlay.guideClosed}
                  parts={measurementOverlay.parts}
                />
              )}
            </MapView>

            {session.tool && toolPointer && (
              <MapToolCursor
                tool={session.tool}
                lassoBehaviour={session.lasso?.behaviour}
                lassoRadiusPx={session.lasso?.radiusPx}
                x={toolPointer.x}
                y={toolPointer.y}
              />
            )}

            {regionName && (
              <div className="pointer-events-none absolute bottom-16 left-3 z-10 max-w-[14rem] rounded-lg bg-surface/90 px-3 py-2 text-sm font-medium leading-snug text-white shadow-[0_2px_8px_rgb(0_0_0/0.35)]">
                {regionName}
              </div>
            )}
            <div className="pointer-events-none absolute bottom-16 right-3 z-10 rounded-lg bg-surface/90 px-3 py-2 text-xs font-medium tracking-tight text-slate-100 shadow-[0_2px_8px_rgb(0_0_0/0.35)]">
              ScaleFindr
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
            <Toolbox
              session={session}
              onToggle={() => setSession((current) => toggleMenu(current))}
              onChoose={(tool) => setSession((current) => chooseTool(current, tool))}
            />
            {session.polygon && (
              <div className="pointer-events-auto min-h-0 w-full">
                <MeasureMenu
                  measurement={session.polygon}
                  onDone={handleDone}
                  onDelete={handleDelete}
                  onAdd={handleAdd}
                />
              </div>
            )}
            {session.ruler && (
              <div className="pointer-events-auto min-h-0 w-full">
                <RulerMenu ruler={session.ruler} onDone={handleDone} onDelete={handleDelete} />
              </div>
            )}
            {session.lasso && (
              <div className="pointer-events-auto min-h-0 w-full">
                <LassoMenu
                  lasso={session.lasso}
                  onSettings={(radiusPx, maxChannelDelta) =>
                    setSession((current) => setLassoSettings(current, radiusPx, maxChannelDelta))
                  }
                  onBehaviour={(behaviour) => setSession((current) => setSessionLassoBehaviour(current, behaviour))}
                  onAdd={handleAdd}
                  onDelete={handleDelete}
                />
              </div>
            )}
            {session.circle && (
              <div className="pointer-events-auto min-h-0 w-full">
                <ShapeMenu
                  title="Circle"
                  lengthLabel="Radius"
                  lengthM={circleLengthM}
                  areaM2={circleAreaM2}
                  message={session.circle.message}
                  canAdd={shapeCanAdd}
                  onAdd={handleAdd}
                  onDelete={handleDelete}
                />
              </div>
            )}
            {session.square && (
              <div className="pointer-events-auto min-h-0 w-full">
                <ShapeMenu
                  title="Square"
                  lengthLabel="Side"
                  lengthM={squareLengthM}
                  areaM2={squareAreaM2}
                  message={session.square.message}
                  canAdd={shapeCanAdd}
                  shape={session.square.status === 'origin' ? session.square.shape : undefined}
                  onShape={
                    session.square.status === 'origin'
                      ? (shape) => setSession((current) => setSquareMode(current, shape))
                      : undefined
                  }
                  onAdd={handleAdd}
                  onDelete={handleDelete}
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
              className="pointer-events-auto min-h-11 max-w-[12rem] rounded-lg bg-surface/95 px-3 text-base text-white shadow-[0_2px_8px_rgb(0_0_0/0.35)]"
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
