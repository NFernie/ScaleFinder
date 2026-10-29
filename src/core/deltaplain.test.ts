import { describe, expect, it } from 'vitest'
import {
  DELTA_PLAIN_COLOUR,
  DELTA_PLAIN_THICKNESS,
  beachRidgeCrestY,
  deltaPlainContains,
  deltaPlainShape,
  landwardContour,
} from './deltaplain'
import { sceneAt as tfwSceneAt } from './tfwEcsSchematic'
import { tidalChannelFrameAt, tidalChannelSpan } from './tidalChannel'
import { sceneAt as wfSceneAt, waterlineY } from './wfSchematic'

describe('delta plain', () => {
  it('follows the Tfw beach ridges, channels, and the landward edge of the water slab', () => {
    const tfw = tfwSceneAt(0)
    const shape = deltaPlainShape('tfw', tfw)
    const plain = tfw.find((body) => body.id === 'e-deltaplain')!
    const source = tfw.find((body) => body.id === shape.heightSourceId)!
    const ground = tfw.find((body) => body.id === 'ecs')!
    const landZ = ground.nested.z - ground.groundSpan!.depth / 2
    const minX = ground.nested.x - ground.groundSpan!.width / 2
    const maxX = ground.nested.x + ground.groundSpan!.width / 2

    expect(shape.heightSourceId).toBe('e-ridge-sr-0')
    const crest = beachRidgeCrestY('tfw', source)
    expect(crest).toBeGreaterThan(waterlineY())
    expect(shape.y).toBeCloseTo(crest)
    expect(plain.kind).toBe('delta-plain')
    expect(plain.parentId).toBe('ecs')
    expect(plain.nested.y + DELTA_PLAIN_THICKNESS / 2).toBeCloseTo(crest)
    expect(DELTA_PLAIN_COLOUR).toBe(0x15803d)
    expect(wfSceneAt(0).some((body) => body.kind === 'delta-plain')).toBe(false)

    let minWorldZ = Infinity
    let minWorldX = Infinity
    let maxWorldX = -Infinity
    const topY = DELTA_PLAIN_THICKNESS / 2
    for (let i = 1; i < shape.positions.length; i += 3) {
      if (Math.abs(shape.positions[i] - topY) > 1e-6) continue
      minWorldZ = Math.min(minWorldZ, shape.positions[i + 1] + shape.origin.z)
      minWorldX = Math.min(minWorldX, shape.positions[i - 1] + shape.origin.x)
      maxWorldX = Math.max(maxWorldX, shape.positions[i - 1] + shape.origin.x)
    }
    expect(minWorldZ).toBeCloseTo(landZ, 5)
    expect(minWorldX).toBeCloseTo(minX, 5)
    expect(maxWorldX).toBeCloseTo(maxX, 5)

    expect(deltaPlainContains(shape, ground.nested.x, landZ + 0.05)).toBe(true)
    expect(deltaPlainContains(shape, 2, -1.5)).toBe(true)
    expect(deltaPlainContains(shape, -5.5, -2)).toBe(true)
    expect(deltaPlainContains(shape, 2, 2)).toBe(false)

    const half = tfw.find((body) => body.id === 'e-channel-l')!
    expect(deltaPlainContains(shape, half.nested.x, half.nested.z)).toBe(false)

    const channel = tfw.find((body) => body.id === 'e-channel')!
    const frame = tidalChannelFrameAt(tidalChannelSpan().landZ)
    const yaw = channel.yaw ?? 0
    const tip = {
      x: channel.nested.x + frame.x * Math.cos(yaw) + frame.z * Math.sin(yaw),
      z: channel.nested.z - frame.x * Math.sin(yaw) + frame.z * Math.cos(yaw),
    }
    expect(deltaPlainContains(shape, tip.x, tip.z)).toBe(false)

    for (const id of ['e-ridge-hl-0', 'e-ridge-r-0']) {
      const contour = landwardContour('tfw', tfw.find((body) => body.id === id)!)
      const mid = contour[Math.floor(contour.length / 2)]
      expect(deltaPlainContains(shape, mid.x, mid.z - 0.08)).toBe(true)
      expect(deltaPlainContains(shape, mid.x, mid.z + 0.08)).toBe(false)
    }
  })
})