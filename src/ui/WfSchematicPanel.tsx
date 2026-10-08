import { useEffect, useState } from 'react'
import { sceneAt } from '../core/wfSchematic'
import WfSchematicView from './WfSchematicView'

let webglProbe: boolean | undefined

export function webglAvailable(): boolean {
  if (webglProbe !== undefined) return webglProbe
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl2') || canvas.getContext('webgl')
    webglProbe = Boolean(context)
    if (context) context.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    webglProbe ??= false
  }
  return webglProbe
}

interface Props {
  open: boolean
  onClose: () => void
}

const CAPTION =
  'Type schematic for a wave-dominated, fluvial-influenced shoreline. Size and direction are not a measured map of this coast.'

export default function WfSchematicPanel({ open, onClose }: Props) {
  const [explode, setExplode] = useState(0)

  useEffect(() => {
    if (open) setExplode(0)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      document.getElementById('wf-schematic-pin')?.focus()
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const bodies = sceneAt(0)
  const showText = !webglAvailable()

  return (
    <section
      role="dialog"
      aria-label="Sfântu Gheorghe"
      className="toolbox-pop pointer-events-auto w-[min(22rem,calc(100vw-1.5rem))] rounded-xl border border-white/15 bg-surface-raised/95 p-3 text-sm text-slate-100 shadow-[0_2px_8px_rgb(0_0_0/0.35)]"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Sfântu Gheorghe</h2>
          <p className="text-xs text-[#5eead4]">Wf schematic</p>
        </div>
        <button
          type="button"
          onClick={() => {
            document.getElementById('wf-schematic-pin')?.focus()
            onClose()
          }}
          className="pressable min-h-11 rounded-lg px-3 text-sm text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5eead4]"
        >
          Close
        </button>
      </div>
      <p className="mb-3 text-xs leading-relaxed text-slate-300">{CAPTION}</p>
      {showText ? (
        <ul className="max-h-56 space-y-1 overflow-auto text-xs">
          {bodies.map((body) => (
            <li key={body.id}>
              <span>{body.name}</span>
              {body.parentId ? ` · inside ${bodies.find((parent) => parent.id === body.parentId)?.name}` : ''}
            </li>
          ))}
        </ul>
      ) : (
        <WfSchematicView explode={explode} />
      )}
      <label className="mt-3 block text-xs">
        Explode
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={explode}
          aria-label="Explode"
          onChange={(event) => setExplode(Number(event.target.value))}
          className="mt-1 w-full"
        />
      </label>
    </section>
  )
}
