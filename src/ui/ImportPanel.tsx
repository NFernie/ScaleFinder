import { useId, useRef, useState } from 'react'
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

const SAMPLES = [
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
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const file = files[0]
    const text = await file.text()
    onImport(text, file.name)
  }

  return (
    <section aria-label="Import polygon" className="space-y-4">
      <div>
        <span className="mb-1.5 block text-xs text-slate-400">Coordinate units</span>
        <div
          role="radiogroup"
          aria-label="Coordinate units"
          className="inline-flex gap-1 rounded-lg border border-white/10 bg-surface-overlay p-1"
        >
          {LENGTH_UNITS.map((u) => (
            <button
              key={u}
              type="button"
              role="radio"
              aria-checked={unit === u}
              onClick={() => onUnitChange(u)}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
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
        className={`rounded-xl border border-dashed p-5 text-center transition ${
          dragOver ? 'border-accent bg-accent/10' : 'border-white/15 bg-black/20'
        }`}
      >
        <p className="text-sm text-slate-300">
          Drop a <span className="font-mono">.txt</span> or{' '}
          <span className="font-mono">.csv</span> polygon here
        </p>
        <p className="mt-1 text-xs text-slate-500">Rows of X, Y[, Z] · comma/space/tab separated</p>
        <label htmlFor={inputId} className="sr-only">
          Choose polygon file
        </label>
        <input
          id={inputId}
          ref={fileRef}
          type="file"
          accept=".txt,.csv,text/plain,text/csv"
          className="sr-only"
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-teal-950 hover:brightness-105"
        >
          Choose file
        </button>
      </div>

      <div>
        <span className="mb-1.5 block text-xs text-slate-400">Or load a sample</span>
        <div className="flex flex-wrap gap-2">
          {SAMPLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onLoadSample(s.id)}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/5"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {sourceName && !error && (
        <p className="text-xs text-slate-400">
          Loaded <span className="font-mono text-slate-200">{sourceName}</span>
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
    </section>
  )
}
