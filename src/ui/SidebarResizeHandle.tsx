import { useRef } from 'react'
import { MAP_MIN_PX, SIDEBAR_MIN_PX, SIDEBAR_STEP_PX, clampSidebarWidth } from './sidebarWidth'

interface SidebarResizeHandleProps {
  width: number
  containerWidth: () => number
  onWidth: (next: number) => void
}

export default function SidebarResizeHandle({ width, containerWidth, onWidth }: SidebarResizeHandleProps) {
  const drag = useRef<{ startX: number; startWidth: number } | null>(null)
  const apply = (next: number) => onWidth(clampSidebarWidth(next, containerWidth()))
  const max = Math.max(SIDEBAR_MIN_PX, containerWidth() - MAP_MIN_PX)

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      aria-valuemin={SIDEBAR_MIN_PX}
      aria-valuenow={Math.round(width)}
      aria-valuemax={max}
      tabIndex={0}
      className="absolute right-0 top-0 z-20 hidden h-full w-11 translate-x-1/2 cursor-col-resize items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:flex"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId)
        drag.current = { startX: event.clientX, startWidth: width }
      }}
      onPointerMove={(event) => {
        if (!drag.current) return
        apply(drag.current.startWidth + event.clientX - drag.current.startX)
      }}
      onPointerUp={() => {
        drag.current = null
      }}
      onPointerCancel={() => {
        drag.current = null
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') {
          event.preventDefault()
          apply(width + SIDEBAR_STEP_PX)
        }
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          apply(width - SIDEBAR_STEP_PX)
        }
      }}
    >
      <span aria-hidden="true" className="h-10 w-1 rounded-full bg-white/25" />
    </div>
  )
}
