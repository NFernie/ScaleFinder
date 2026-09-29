import { forwardRef, ReactNode, useEffect, useRef } from 'react'
import type { Map as MaplibreMap } from 'maplibre-gl'
import Map, {
  MapLayerMouseEvent,
  MapLayerTouchEvent,
  MapRef,
  NavigationControl,
  ScaleControl,
} from 'react-map-gl/maplibre'
import { Basemap } from './basemap'

/** On the canvas container. Beats `.maplibregl-interactive` and its `:active` rule. */
export const MAP_HIDE_NATIVE_CURSOR_CLASS = 'map-hide-native-cursor'

interface Props {
  basemap: Basemap
  children?: ReactNode
  onLoad?: () => void
  onMapClick?: (event: MapLayerMouseEvent) => void
  onMapDoubleClick?: (event: MapLayerMouseEvent) => void
  onMapMouseMove?: (event: MapLayerMouseEvent) => void
  onMapMouseDown?: (event: MapLayerMouseEvent) => void
  onMapMouseUp?: (event: MapLayerMouseEvent) => void
  onMapTouchStart?: (event: MapLayerTouchEvent) => void
  onMapTouchMove?: (event: MapLayerTouchEvent) => void
  doubleClickZoom?: boolean
  dragPan?: boolean
  /** Hide MapLibre's grab cursor while a tool overlay is the pointer. */
  hideNativeCursor?: boolean
}

const INITIAL_VIEW = {
  longitude: 0,
  latitude: 20,
  zoom: 1.6,
}

/**
 * MapLibre map wrapper. `preserveDrawingBuffer` is enabled so the WebGL canvas
 * can be read back for the PNG snapshot.
 */
const MapView = forwardRef<MapRef, Props>(function MapView(
  {
    basemap,
    children,
    onLoad,
    onMapClick,
    onMapDoubleClick,
    onMapMouseMove,
    onMapMouseDown,
    onMapMouseUp,
    onMapTouchStart,
    onMapTouchMove,
    doubleClickZoom = true,
    dragPan = true,
    hideNativeCursor = false,
  },
  ref,
) {
  const maplibreRef = useRef<MaplibreMap | null>(null)

  useEffect(() => {
    const container = maplibreRef.current?.getCanvasContainer()
    container?.classList.toggle(MAP_HIDE_NATIVE_CURSOR_CLASS, hideNativeCursor)
  }, [hideNativeCursor])

  return (
    <Map
      ref={ref}
      initialViewState={INITIAL_VIEW}
      mapStyle={basemap.styleUrl}
      preserveDrawingBuffer
      onLoad={(event) => {
        maplibreRef.current = event.target
        event.target.getCanvasContainer().classList.toggle(MAP_HIDE_NATIVE_CURSOR_CLASS, hideNativeCursor)
        onLoad?.()
      }}
      onClick={onMapClick}
      onDblClick={onMapDoubleClick}
      onMouseMove={onMapMouseMove}
      onMouseDown={onMapMouseDown}
      onMouseUp={onMapMouseUp}
      onTouchStart={onMapTouchStart}
      onTouchMove={onMapTouchMove}
      doubleClickZoom={doubleClickZoom}
      dragPan={dragPan}
      style={{ width: '100%', height: '100%' }}
    >
      <NavigationControl position="top-right" />
      <ScaleControl position="bottom-left" unit="metric" maxWidth={220} />
      {children}
    </Map>
  )
})

export default MapView
