import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { sceneAt, type PlacedBody, type SolidKind } from '../core/wfSchematic'

const COLOUR: Record<SolidKind, number> = {
  ground: 0xcbd5e1,
  lobe: 0x7dd3fc,
  'mouth-slab': 0x14532d,
  channel: 0xf97316,
  'mouth-bar': 0x4ade80,
  'beach-ridge': 0xeab308,
  swale: 0x9ca3af,
  group: 0xe2e8f0,
}

function geometryFor(kind: SolidKind): THREE.BufferGeometry {
  if (kind === 'ground') return new THREE.BoxGeometry(8, 0.05, 6)
  if (kind === 'lobe') return new THREE.SphereGeometry(1.15, 16, 10).scale(1.6, 0.18, 1)
  if (kind === 'mouth-slab') return new THREE.BoxGeometry(3.4, 0.06, 2.2)
  if (kind === 'channel') return new THREE.BoxGeometry(0.28, 0.12, 2.4)
  if (kind === 'mouth-bar') return new THREE.SphereGeometry(0.28, 12, 8).scale(1.2, 0.45, 1)
  if (kind === 'beach-ridge') return new THREE.BoxGeometry(0.55, 0.16, 0.9)
  if (kind === 'swale') return new THREE.BoxGeometry(0.4, 0.06, 0.7)
  return new THREE.BoxGeometry(0.01, 0.01, 0.01)
}

function makeLabel(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 96
  const context = canvas.getContext('2d')
  if (!context) return new THREE.Sprite()
  context.fillStyle = '#e2e8f0'
  context.font = '36px sans-serif'
  context.fillText(text, 8, 58)
  const material = new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(canvas),
    transparent: true,
    depthTest: false,
  })
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
    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const sun = new THREE.DirectionalLight(0xffffff, 1.15)
    sun.position.set(4, 8, 3)
    scene.add(sun)

    const objects = new Map<string, THREE.Object3D>()
    const geometries: THREE.BufferGeometry[] = []
    for (const body of sceneAt(0)) {
      const group = new THREE.Group()
      if (body.kind !== 'group') {
        const geometry = geometryFor(body.kind)
        geometries.push(geometry)
        group.add(
          new THREE.Mesh(
            geometry,
            new THREE.MeshStandardMaterial({ color: COLOUR[body.kind], roughness: 0.72 }),
          ),
        )
      }
      group.add(makeLabel(body.name))
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
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={host} className="h-56 w-full" data-wf-view="" />
}
