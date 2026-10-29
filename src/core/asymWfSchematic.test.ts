import { describe, expect, it } from 'vitest'
import { ASYM_WF_ANCHOR, bodyCenter as asymCenter, sceneAt as asymSceneAt } from './asymWfSchematic'
import { beachRidgeMesh } from './schematicScene'
import { bodyCenter as wfCenter, sceneAt as wfSceneAt } from './wfSchematic'

describe('asymWfSchematic', () => {
  it('keeps the Sfântu Gheorghe pin and the symmetric scene layout', () => {
    expect(ASYM_WF_ANCHOR).toEqual({ lat: 44.878674, lng: 29.515563 })
    const asym = asymSceneAt(0)
    const wf = wfSceneAt(0)
    expect(asym.map((body) => body.id)).toEqual(wf.map((body) => body.id))
    for (const body of asym) {
      const match = wf.find((item) => item.id === body.id)
      const leftSwale = body.kind === 'swale' && body.id.startsWith('e-swale-l-')
      if (leftSwale) expect(body.position.z).not.toBeCloseTo(match?.position.z ?? 0, 2)
      else expect(body.position).toEqual(match?.position)
      expect(body.yaw).toEqual(match?.yaw)
      expect(body.parentId).toEqual(match?.parentId)
    }
    expect(asymCenter(asym.find((body) => body.id === 'e-ridge-r-0')!)).toEqual(
      wfCenter(wf.find((body) => body.id === 'e-ridge-r-0')!),
    )
    expect(asymCenter(asym.find((body) => body.id === 'e-mouth-0')!)).toEqual(
      wfCenter(wf.find((body) => body.id === 'e-mouth-0')!),
    )
    expect(asymCenter(asym.find((body) => body.id === 'e-channel')!)).toEqual(
      wfCenter(wf.find((body) => body.id === 'e-channel')!),
    )
    expect(asymCenter(asym.find((body) => body.id === 'e-ridge-l-0')!).z).not.toBeCloseTo(
      wfCenter(wf.find((body) => body.id === 'e-ridge-l-0')!).z,
    )
    expect(beachRidgeMesh('asym', 'e-ridge-l-2')).toBe('asymmetric')
    expect(beachRidgeMesh('asym', 'e-ridge-r-2')).toBe('symmetric')
    expect(beachRidgeMesh('wf', 'e-ridge-l-2')).toBe('symmetric')
  })
})
