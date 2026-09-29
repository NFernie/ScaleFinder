import { forwardRef, ReactNode } from 'react'
import Map, {
  MapLayerMouseEvent,
  MapLayerTouchEvent,
  MapRef,
  NavigationControl,
  ScaleControl,
} from 'react-map-gl/maplibre'
import { Basemap } from './basemap'

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
  },
  ref,
) {
  return (
    <Map
      ref={ref}
      initialViewState={INITIAL_VIEW}
      mapStyle={basemap.styleUrl}
      preserveDrawingBuffer
      onLoad={onLoad}
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
