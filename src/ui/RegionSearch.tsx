import { useState } from 'react'
import { filterNotableRegions, geocodeMapTiler, Region } from '../map/regions'

interface Props {
  mapTilerKey?: string
  onSelect: (region: Region) => void
}

export default function RegionSearch({ mapTilerKey, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [remote, setRemote] = useState<Region[]>([])
  const [searching, setSearching] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const local = filterNotableRegions(query)

  async function searchWorldwide() {
    if (!mapTilerKey || !query.trim()) return
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
          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        {mapTilerKey && (
          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="whitespace-nowrap rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/5 disabled:opacity-40"
          >
            {searching ? '…' : 'Worldwide'}
          </button>
        )}
      </form>

      {err && <p className="text-xs text-red-400">{err}</p>}

      <ul className="flex flex-wrap gap-2">
        {[...remote, ...local].slice(0, 12).map((r, i) => (
          <li key={`${r.name}-${i}`}>
            <button
              type="button"
              onClick={() => onSelect(r)}
              className="rounded-full border border-white/15 px-3 py-1 text-xs text-slate-200 hover:bg-white/5"
            >
              {r.name}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
