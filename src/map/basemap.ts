export interface Basemap {
  id: string
  label: string
  styleUrl: string
  /** True for MapTiler styles that require an API key. */
  requiresKey: boolean
}

const OPENFREEMAP: Basemap[] = [
  {
    id: 'ofm-liberty',
    label: 'Liberty (OpenFreeMap)',
    styleUrl: 'https://tiles.openfreemap.org/styles/liberty',
    requiresKey: false,
  },
  {
    id: 'ofm-positron',
    label: 'Positron (OpenFreeMap)',
    styleUrl: 'https://tiles.openfreemap.org/styles/positron',
    requiresKey: false,
  },
]

function maptiler(key: string): Basemap[] {
  const withKey = (style: string) =>
    `https://api.maptiler.com/maps/${style}/style.json?key=${key}`
  return [
    { id: 'mt-streets', label: 'Streets (MapTiler)', styleUrl: withKey('streets-v2'), requiresKey: true },
    { id: 'mt-hybrid', label: 'Satellite (MapTiler)', styleUrl: withKey('hybrid'), requiresKey: true },
    { id: 'mt-topo', label: 'Topo (MapTiler)', styleUrl: withKey('topo-v2'), requiresKey: true },
  ]
}

/**
 * Available basemaps for the given MapTiler key. When a key is present, MapTiler
 * styles are offered first; the keyless OpenFreeMap styles are always available
 * as a fallback (and are the only option in development without a key).
 */
export function getBasemaps(key?: string): Basemap[] {
  const trimmed = key?.trim()
  if (trimmed) return [...maptiler(trimmed), ...OPENFREEMAP]
  return OPENFREEMAP
}

export function hasMapTilerKey(key?: string): boolean {
  return Boolean(key?.trim())
}
