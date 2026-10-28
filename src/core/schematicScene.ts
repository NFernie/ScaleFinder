export type SchematicSceneId = 'wf' | 'asym' | 'tfw'

/** Which beach-ridge loft a scene draws. */
export function beachRidgeMesh(
  scene: SchematicSceneId,
  bodyId: string,
): 'symmetric' | 'asymmetric' | 'convex-sw' {
  if (scene === 'tfw' && bodyId.startsWith('e-ridge-l-')) return 'convex-sw'
  if (scene === 'tfw' && bodyId.startsWith('e-ridge-')) return 'asymmetric'
  if (scene === 'asym' && bodyId.startsWith('e-ridge-') && !bodyId.includes('-r-')) return 'asymmetric'
  return 'symmetric'
}

/** Which channel loft a scene draws. */
export function channelMesh(scene: SchematicSceneId): 'half' | 'tidal' {
  return scene === 'tfw' ? 'tidal' : 'half'
}
