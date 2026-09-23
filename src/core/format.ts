export function formatArea(areaM2: number): string {
  const km2 = areaM2 / 1_000_000
  if (km2 < 0.01) return `${Math.round(areaM2).toLocaleString()} m²`
  if (km2 < 1) return `${(km2 * 100).toFixed(1)} ha`
  if (km2 >= 1000)
    return `${km2.toLocaleString(undefined, { maximumFractionDigits: 0 })} km²`
  return `${km2.toFixed(2)} km²`
}

export function formatLength(metres: number): string {
  if (metres < 1000) return `${Math.round(metres).toLocaleString()} m`
  return `${(metres / 1000).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })} km`
}
