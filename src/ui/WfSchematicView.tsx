import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import {
  beachRidgeRing,
  beachRidgeStations,
  MOUTH_BAR_SCALE,
  sceneAt,
  type PlacedBody,
  type SolidKind,
} from '../core/wfSchematic'
import { halfChannelGeometry } from './halfChannelGeometry'

const COLOUR: Record<SolidKind, number> = {
  ground: 0xcbd5e1,
  channel: 0xf97316,
  'mouth-bar': 0x4ade80,
  'beach-ridge': 0xeab308,
  group: 0xe2e8f0,
}

function beachRidgeGeometry(side: 'l' | 'r'): THREE.BufferGeometry {
  const stations = beachRidgeStations('r')
  const positions: number[] = []
  const indices: number[] = []
  for (const station of stations) {
    for (const corner of beachRidgeRing(station)) {
      positions.push(corner.x, corner.y, corner.z)
    }
  }
  const quad = (a: number, b: number, c: number, d: number) => {
    indices.push(a, b, c, a, c, d)
  }
  for (let s = 0; s < stations.length - 1; s += 1) {
    const a = s * 4
    const b = (s + 1) * 4
    quad(a, b, b + 1, a + 1)
    quad(a + 1, b + 1, b + 2, a + 2)
    quad(a + 2, b + 2, b + 3, a + 3)
    quad(a + 3, b + 3, b, a)
  }
  quad(0, 1, 2, 3)
  const tip = (stations.length - 1) * 4
  quad(tip, tip + 3, tip + 2, tip + 1)
  if (side === 'l') {
    for (let i = 0; i < positions.length; i += 3) positions[i] = -positions[i]
    for (let i = 0; i < indices.length; i += 3) {
      const swap = indices[i + 1]
      indices[i + 1] = indices[i + 2]
      indices[i + 2] = swap
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function geometryFor(body: PlacedBody): THREE.BufferGeometry {
  if (body.kind === 'ground') return new THREE.BoxGeometry(8, 0.05, 6)
  if (body.kind === 'channel') return halfChannelGeometry()
  if (body.kind === 'mouth-bar') {
    const geometry = new THREE.SphereGeometry(0.5, 28, 18)
    geometry.scale(MOUTH_BAR_SCALE.x, MOUTH_BAR_SCALE.y, MOUTH_BAR_SCALE.z)
    return geometry
  }
  if (body.kind === 'beach-ridge') {
    return beachRidgeGeometry(body.id.includes('-r-') ? 'r' : 'l')
  }
  return new THREE.BoxGeometry(0.01, 0.01, 0.01)
}

function makeLabel(
  text: string,
  spriteMaterials: THREE.SpriteMaterial[],
  labelTextures: THREE.Texture[],
): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 96
  const context = canvas.getContext('2d')
  if (!context) {
    const material = new THREE.SpriteMaterial()
    spriteMaterials.push(material)
    return new THREE.Sprite(material)
  }
  context.fillStyle = '#e2e8f0'
  context.font = '36px sans-serif'
  context.fillText(text, 8, 58)
  const texture = new THREE.CanvasTexture(canvas)
  labelTextures.push(texture)
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  })
  spriteMaterials.push(material)
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(1.6, 0.3, 1)
  sprite.position.y = 0.45
  return sprite
}

function place(object: THREE.Object3D, body: PlacedBody) {
  object.position.set(body.position.x, body.position.y, body.position.z)
}

export default function WfSchematicView({ explode }: { explode: number }) {
  const host = useRef<HTMLDivElement>(null)
  const explodeRef = useRef(explode)
  explodeRef.current = explode

  useEffect(() => {
    const el = host.current
    if (!el) return
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
    camera.position.set(6.5, 5.5, 7.5)
    camera.lookAt(0, 0.4, 0.6)
    scene.add(new THREE.AmbientLight(0xffffff, 0.35))
    scene.add(new THREE.HemisphereLight(0xe2e8f0, 0x64748b, 0.65))
    const sun = new THREE.DirectionalLight(0xffffff, 1.15)
    sun.position.set(5, 7, -2)
    scene.add(sun)

    const objects = new Map<string, THREE.Object3D>()
    const geometries: THREE.BufferGeometry[] = []
    const meshMaterials: THREE.Material[] = []
    const spriteMaterials: THREE.SpriteMaterial[] = []
    const labelTextures: THREE.Texture[] = []
    for (const body of sceneAt(0)) {
      const group = new THREE.Group()
      if (body.kind !== 'group') {
        const geometry = geometryFor(body)
        geometries.push(geometry)
        const material = new THREE.MeshStandardMaterial({
          color: COLOUR[body.kind],
          roughness: 0.72,
          flatShading: body.kind === 'beach-ridge',
        })
        meshMaterials.push(material)
        group.add(new THREE.Mesh(geometry, material))
      }
      group.add(makeLabel(body.name, spriteMaterials, labelTextures))
      place(group, body)
      scene.add(group)
      objects.set(body.id, group)
    }

    const resize = () => {
      const width = el.clientWidth || 320
      const height = el.clientHeight || 224
      renderer.setSize(width, height, false)
      camera.aspect = width / Math.max(height, 1)
      camera.updateProjectionMatrix()
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(el)
    el.appendChild(renderer.domElement)

    let frame = 0
    const tick = () => {
      for (const body of sceneAt(explodeRef.current)) {
        const object = objects.get(body.id)
        if (object) place(object, body)
      }
      renderer.render(scene, camera)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      geometries.forEach((geometry) => geometry.dispose())
      meshMaterials.forEach((material) => material.dispose())
      spriteMaterials.forEach((material) => material.dispose())
      labelTextures.forEach((texture) => texture.dispose())
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={host} className="h-56 w-full" data-wf-view="" />
}
