import { forwardRef, ReactNode } from 'react'

const MapViewStub = forwardRef<HTMLDivElement, { children?: ReactNode }>(function MapViewStub(
  { children },
  _ref,
) {
  return <div>{children}</div>
})

export default MapViewStub
