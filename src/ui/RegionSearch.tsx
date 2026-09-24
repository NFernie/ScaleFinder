import { useState } from 'react'
import { filterNotableRegions, geocodeMapTiler, Region } from '../map/regions'

interface Props {
  mapTilerKey?: string
  selectedName: string | null
  onSelect: (region: Region) => void
}

export default function RegionSearch({ mapTilerKey, selectedName, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [remote, setRemote] = useState<Region[]>([])
  const [searching, setSearching] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const local = filterNotableRegions(query)
  const results = [...remote, ...local].slice(0, 12)
  const trimmed = query.trim()

  async function searchWorldwide() {
    if (!mapTilerKey || !trimmed) return
    setSearching(true)
    setErr(null)
    try {
      setRemote(await geocodeMapTiler(query, mapTilerKey))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  return (
    <section aria-label="Find a region" className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void searchWorldwide()
        }}
        className="flex gap-2"
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search regions (e.g. Nile Delta)"
          aria-label="Search regions"
          enterKeyHint="search"
          autoCapitalize="off"
          autoCorrect="off"
          className="min-h-11 w-full rounded-lg bg-surface-overlay px-3 text-base focus:outline-none"
        />
        {mapTilerKey && (
          <button
            type="submit"
            disabled={searching || !trimmed}
            className="pressable min-h-11 min-w-[7.5rem] whitespace-nowrap rounded-lg bg-surface-overlay px-3 text-sm text-slate-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {searching ? 'Searching' : 'Worldwide'}
          </button>
        )}
      </form>

      {err && (
        <p role="alert" className="text-sm leading-relaxed text-red-400">
          {err}. Check the connection and try the search again.
        </p>
      )}

      {trimmed && !searching && results.length === 0 && !err && (
        <p role="status" className="text-sm leading-relaxed text-slate-300">
          {mapTilerKey
            ? `No region matches "${trimmed}". Try another name, or search worldwide.`
            : `No curated region matches "${trimmed}". Clear the search to see notable deltas and rivers.`}
        </p>
      )}

      {results.length > 0 && (
        <ul
          aria-label="Regions"
          className="max-h-48 divide-y divide-white/10 overflow-y-auto overscroll-contain rounded-lg bg-surface-overlay/60"
        >
          {results.map((r, i) => {
            const selected = selectedName === r.name
            return (
              <li key={`${r.name}-${i}`}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelect(r)}
                  className={`pressable flex min-h-11 w-full items-center px-3 text-left text-sm ${
                    selected
                      ? 'bg-accent-strong text-teal-50'
                      : 'text-slate-200 hover:bg-white/5'
                  }`}
                >
                  {r.name}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
