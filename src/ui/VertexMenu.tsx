import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export interface VertexMenuProps {
  x: number
  y: number
  frame: { width: number; height: number }
  onAdd: () => void
  onDelete: () => void
  onClose: () => void
}

export default function VertexMenu({ x, y, frame, onAdd, onDelete, onClose }: VertexMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [shift, setShift] = useState({ x: 0, y: 0 })

  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    let dx = 0
    let dy = 0
    if (x + node.offsetWidth > frame.width) dx = frame.width - (x + node.offsetWidth)
    if (y + node.offsetHeight > frame.height) dy = frame.height - (y + node.offsetHeight)
    if (x + dx < 0) dx = -x
    if (y + dy < 0) dy = -y
    setShift({ x: dx, y: dy })
  }, [x, y, frame.width, frame.height])

  useEffect(() => {
    ref.current?.querySelector('button')?.focus()
  }, [])

  return (
    <div
      ref={ref}
      role="menu"
      className="toolbox-pop absolute z-30 flex min-w-[10rem] flex-col rounded-xl border border-white/15 bg-surface/95 p-1 text-sm text-slate-100 shadow-[0_2px_8px_rgb(0_0_0/0.35)]"
      style={{ left: x + shift.x, top: y + shift.y }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
    >
      <button type="button" role="menuitem" className="pressable min-h-11 rounded-lg px-3 text-left text-slate-100 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5eead4]" onClick={onAdd}>
        Add vertex
      </button>
      <button type="button" role="menuitem" className="pressable min-h-11 rounded-lg px-3 text-left text-slate-100 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5eead4]" onClick={onDelete}>
        Delete vertex
      </button>
    </div>
  )
}
