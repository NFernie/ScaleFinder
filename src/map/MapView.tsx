import { forwardRef, ReactNode } from 'react'
import Map, {
  MapLayerMouseEvent,
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
  doubleClickZoom?: boolean
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
  { basemap, children, onLoad, onMapClick, onMapDoubleClick, doubleClickZoom = true },
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
      doubleClickZoom={doubleClickZoom}
      style={{ width: '100%', height: '100%' }}
    >
      <NavigationControl position="top-right" />
      <ScaleControl position="bottom-left" unit="metric" maxWidth={220} />
      {children}
    </Map>
  )
})

export default MapView
