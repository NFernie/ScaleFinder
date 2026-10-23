export type SchematicSceneId = 'wf' | 'asym'

/** Which beach-ridge loft a scene draws. Only the asymmetric scene swaps the left flank. */
export function beachRidgeMesh(scene: SchematicSceneId, bodyId: string): 'symmetric' | 'asymmetric' {
  if (scene === 'asym' && bodyId.startsWith('e-ridge-') && !bodyId.includes('-r-')) return 'asymmetric'
  return 'symmetric'
}
