import { forwardRef, ReactNode } from 'react'
import Map, {
  MapRef,
  NavigationControl,
  ScaleControl,
} from 'react-map-gl/maplibre'
import { Basemap } from './basemap'

interface Props {
  basemap: Basemap
  children?: ReactNode
  onLoad?: () => void
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
  { basemap, children, onLoad },
  ref,
) {
  return (
    <Map
      ref={ref}
      initialViewState={INITIAL_VIEW}
      mapStyle={basemap.styleUrl}
      preserveDrawingBuffer
      onLoad={onLoad}
      style={{ width: '100%', height: '100%' }}
    >
      <NavigationControl position="top-right" />
      <ScaleControl position="bottom-left" unit="metric" maxWidth={220} />
      {children}
    </Map>
  )
})

export default MapView
