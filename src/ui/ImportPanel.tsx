import { KeyboardEvent, useId, useRef, useState } from 'react'
import { LengthUnit } from '../core/types'
import { LENGTH_UNITS } from '../core/units'

interface Props {
  unit: LengthUnit
  onUnitChange: (u: LengthUnit) => void
  onImport: (text: string, fileName: string) => void
  onLoadSample: (name: string) => void
  error: string | null
  sourceName: string | null
}

function readAsText(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(reader.error ?? new Error('Could not read that file.'))
    reader.readAsText(file)
  })
}

const SAMPLE_BUTTONS = [
  { id: 'delta-lobe', label: 'Delta lobe (~180 km²)' },
  { id: 'small-field', label: 'Small field (~6 km²)' },
]

export default function ImportPanel({
  unit,
  onUnitChange,
  onImport,
  onLoadSample,
  error,
  sourceName,
}: Props) {
  const inputId = useId()
  const hintId = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const groupRef = useRef<HTMLDivElement>(null)
  const [dragOver, setDragOver] = useState(false)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const file = files[0]
    const text = await readAsText(file)
    onImport(text, file.name)
    if (fileRef.current) fileRef.current.value = ''
  }

  function onUnitKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const index = LENGTH_UNITS.indexOf(unit)
    let next = index
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % LENGTH_UNITS.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
      next = (index - 1 + LENGTH_UNITS.length) % LENGTH_UNITS.length
    else return
    e.preventDefault()
    const value = LENGTH_UNITS[next]
    onUnitChange(value)
    requestAnimationFrame(() => {
      groupRef.current?.querySelector<HTMLButtonElement>(`[data-unit="${value}"]`)?.focus()
    })
  }

  return (
    <section aria-label="Import Polygon" className="space-y-4">
      <div>
        <span id={`${inputId}-units`} className="mb-1.5 block text-xs text-slate-400">
          Coordinate units
        </span>
        <div
          ref={groupRef}
          role="radiogroup"
          aria-labelledby={`${inputId}-units`}
          onKeyDown={onUnitKeyDown}
          className="inline-flex gap-1 rounded-lg border border-white/10 bg-surface-overlay p-1"
        >
          {LENGTH_UNITS.map((u) => (
            <button
              key={u}
              type="button"
              role="radio"
              data-unit={u}
              aria-checked={unit === u}
              tabIndex={unit === u ? 0 : -1}
              onClick={() => onUnitChange(u)}
              className={`pressable min-h-11 rounded-md px-3 text-sm ${
                unit === u ? 'bg-accent-strong text-teal-50' : 'text-slate-300 hover:text-white'
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          void handleFiles(e.dataTransfer.files)
        }}
        className={`rounded-xl border border-dashed p-5 text-center transition-colors duration-150 ${
          dragOver
            ? 'border-accent bg-accent/10'
            : sourceName && !error
              ? 'border-accent/40 bg-black/20'
              : 'border-white/15 bg-black/20'
        }`}
      >
        <p className="text-sm text-slate-300">
          Drop a <span className="font-mono">.txt</span> or{' '}
          <span className="font-mono">.csv</span> Polygon here
        </p>
        <p id={hintId} className="mt-1 text-xs leading-relaxed text-slate-400">
          Use a two-column file of X and Y values exported from your GIS software. An optional Z
          column is kept and not used for the planform.
        </p>
        <label htmlFor={inputId} className="sr-only">
          Choose Polygon file
        </label>
        <input
          id={inputId}
          ref={fileRef}
          type="file"
          accept=".txt,.csv,text/plain,text/csv"
          aria-describedby={hintId}
          aria-invalid={error ? true : undefined}
          tabIndex={-1}
          className="sr-only"
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="pressable mt-3 min-h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-teal-950 hover:brightness-105"
        >
          Choose file
        </button>
      </div>

      <div>
        <span className="mb-1.5 block text-xs text-slate-400">Or load a sample</span>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_BUTTONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onLoadSample(s.id)}
            className="pressable min-h-11 rounded-lg border border-white/15 px-3 text-sm text-slate-200 hover:bg-white/5"
          >
            {s.label}
          </button>
        ))}
        </div>
      </div>

      {sourceName && !error && (
        <p aria-live="polite" className="text-xs text-slate-300">
          Loaded <span className="font-mono text-slate-100">{sourceName}</span>
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm leading-relaxed text-red-400">
          {error} Use rows of X, Y values and try another file.
        </p>
      )}
    </section>
  )
}
