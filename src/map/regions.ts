export interface Region {
  name: string
  lng: number
  lat: number
  zoom: number
  kind: 'delta' | 'river' | 'other'
}

/** Curated notable regions for quick navigation and offline search. */
export const NOTABLE_REGIONS: Region[] = [
  { name: 'Mississippi Delta', lng: -89.25, lat: 29.15, zoom: 8, kind: 'delta' },
  { name: 'Nile Delta', lng: 31.2, lat: 31.0, zoom: 8, kind: 'delta' },
  { name: 'Danube Delta', lng: 29.3, lat: 45.15, zoom: 8, kind: 'delta' },
  { name: 'Ganges–Brahmaputra Delta', lng: 90.3, lat: 22.5, zoom: 7, kind: 'delta' },
  { name: 'Lena Delta', lng: 126.5, lat: 72.4, zoom: 7, kind: 'delta' },
  { name: 'Okavango Delta', lng: 22.9, lat: -19.3, zoom: 8, kind: 'delta' },
  { name: 'Amazon River', lng: -55.5, lat: -2.5, zoom: 6, kind: 'river' },
  { name: 'Ord River', lng: 128.5, lat: -15.5, zoom: 8, kind: 'river' },
  { name: 'Mississippi River', lng: -91.0, lat: 32.3, zoom: 6, kind: 'river' },
]

/** Case-insensitive substring filter over the curated regions. */
export function filterNotableRegions(query: string): Region[] {
  const q = query.trim().toLowerCase()
  if (!q) return NOTABLE_REGIONS
  return NOTABLE_REGIONS.filter((r) => r.name.toLowerCase().includes(q))
}

/**
 * Geocode a free-text place via MapTiler (only when a key is available).
 * Returns up to `limit` results as Regions. Network call; not used offline.
 */
export async function geocodeMapTiler(
  query: string,
  key: string,
  limit = 5,
): Promise<Region[]> {
  const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(
    query,
  )}.json?key=${key}&limit=${limit}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`)
  const data = (await res.json()) as {
    features: { place_name?: string; text?: string; center: [number, number] }[]
  }
  return data.features.map((f) => ({
    name: f.place_name ?? f.text ?? query,
    lng: f.center[0],
    lat: f.center[1],
    zoom: 8,
    kind: 'other' as const,
  }))
}
