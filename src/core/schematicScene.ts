export type SchematicSceneId = 'wf' | 'asym' | 'tfw'

/** Which beach-ridge loft a scene draws. */
export function beachRidgeMesh(
  scene: SchematicSceneId,
  bodyId: string,
): 'symmetric' | 'asymmetric' | 'convex-sw' | 'concave-sw' {
  if (scene === 'tfw' && bodyId.startsWith('e-ridge-cr-')) return 'concave-sw'
  if (scene === 'tfw' && bodyId.startsWith('e-ridge-hl-')) return 'symmetric'
  if (scene === 'tfw' && bodyId.startsWith('e-ridge-l-')) return 'convex-sw'
  if (scene === 'tfw' && bodyId.startsWith('e-ridge-')) return 'asymmetric'
  if (scene === 'asym' && bodyId.startsWith('e-ridge-') && !bodyId.includes('-r-')) return 'asymmetric'
  return 'symmetric'
}

/** Alongshore side of a beach-ridge body. Concave inspection ridges face +X. */
export function ridgeFlankSide(bodyId: string): 'l' | 'r' {
  if (bodyId.includes('-cr-') || bodyId.includes('-r-')) return 'r'
  return 'l'
}

/** Which channel loft a scene draws. */
export function channelMesh(scene: SchematicSceneId): 'half' | 'tidal' {
  return scene === 'tfw' ? 'tidal' : 'half'
}
