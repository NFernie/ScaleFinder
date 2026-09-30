import { forwardRef, ReactNode, useImperativeHandle, useRef } from 'react'
import { vi } from 'vitest'

interface MapClick {
  lngLat: { lng: number; lat: number }
  originalEvent: { target: EventTarget }
}

interface Props {
  children?: ReactNode
  onMapClick?: (event: MapClick) => void
  onMapDoubleClick?: (event: MapClick) => void
}

export const mapFlyTo = vi.fn()
export const mapGetZoom = vi.fn(() => 5)

const MapViewStub = forwardRef(function MapViewStub(
  { children, onMapClick, onMapDoubleClick }: Props,
  ref,
) {
  const count = useRef(0)
  const last = useRef({ lng: 10, lat: 20 })

  useImperativeHandle(ref, () => ({
    flyTo: mapFlyTo,
    getZoom: mapGetZoom,
    getCenter: () => ({ lng: 10, lat: 20 }),
  }))

  const point = () => {
    count.current += 1
    last.current = { lng: 10 + count.current * 0.01, lat: 20 }
    return {
      lngLat: last.current,
      originalEvent: { target: document.body },
    }
  }

  return (
    <div>
      <button type="button" data-testid="map" onClick={() => onMapClick?.(point())}>
        Map
      </button>
      <button
        type="button"
        data-testid="map-double"
        onClick={() => onMapDoubleClick?.({ lngLat: last.current, originalEvent: { target: document.body } })}
      >
        Map double
      </button>
      {children}
    </div>
  )
})

export default MapViewStub
