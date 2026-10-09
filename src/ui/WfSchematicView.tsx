import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import {
  beachRidgeRing,
  beachRidgeStations,
  GROUND_THICKNESS,
  sceneAt,
  WATER_COLOUR,
  WATER_OPACITY,
  type PlacedBody,
  type SolidKind,
} from '../core/wfSchematic'
import { halfChannelGeometry } from './halfChannelGeometry'
import { mouthBarGeometry } from './mouthBarGeometry'
import { cssEaseOut } from '../core/cssEaseOut'
import { ZOOM_MAX, ZOOM_MIN, zoomDistance } from './schematicFrame'

const TARGET = new THREE.Vector3(0, 0.4, 0.6)

const LABEL_FADE_MS = 120

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

function setCameraDistance(camera: THREE.PerspectiveCamera, distance: number) {
  const offset = camera.position.clone().sub(TARGET)
  const length = offset.length() || 1
  offset.multiplyScalar(distance / length)
  camera.position.copy(TARGET).add(offset)
}

const COLOUR: Record<SolidKind, number> = {
  ground: WATER_COLOUR,
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
  const corners = beachRidgeRing(stations[0]).length
  for (let s = 0; s < stations.length - 1; s += 1) {
    const a = s * corners
    const b = (s + 1) * corners
    for (let i = 0; i < corners; i += 1) {
      const next = (i + 1) % corners
      quad(a + i, b + i, b + next, a + next)
    }
  }
  for (let i = 1; i < corners - 1; i += 1) indices.push(0, i, i + 1)
  const tip = (stations.length - 1) * corners
  for (let i = corners - 1; i >= 2; i -= 1) indices.push(tip, tip + i, tip + i - 1)
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
  if (body.kind === 'ground') return new THREE.BoxGeometry(8, GROUND_THICKNESS, 6)
  if (body.kind === 'channel') return halfChannelGeometry()
  if (body.kind === 'mouth-bar') return mouthBarGeometry()
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
  object.rotation.y = body.yaw ?? 0
}

export type SchematicCameraHandle = {
  zoomBy: (direction: 'in' | 'out') => void
}

const WfSchematicView = forwardRef<
  SchematicCameraHandle,
  { explode: number; width: number; height: number }
>(function WfSchematicView({ explode, width, height }, ref) {
  const host = useRef<HTMLDivElement>(null)
  const explodeRef = useRef(explode)
  explodeRef.current = explode
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)

  useImperativeHandle(
    ref,
    () => ({
      zoomBy(direction: 'in' | 'out') {
        const camera = cameraRef.current
        const controls = controlsRef.current
        if (!camera || !controls) return
        const distance = camera.position.distanceTo(TARGET)
        setCameraDistance(camera, zoomDistance(distance, direction))
        controls.update()
      },
    }),
    [],
  )

  useEffect(() => {
    const el = host.current
    if (!el) return
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.touchAction = 'none'
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
    camera.position.set(6.5, 5.5, 7.5)
    camera.lookAt(TARGET)
    cameraRef.current = camera
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.copy(TARGET)
    controls.enablePan = false
    controls.enableZoom = false
    controls.enableDamping = false
    controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE
    controls.minDistance = ZOOM_MIN
    controls.maxDistance = ZOOM_MAX
    controls.update()
    controlsRef.current = controls
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
          transparent: body.kind === 'ground',
          opacity: body.kind === 'ground' ? WATER_OPACITY : 1,
          depthWrite: body.kind !== 'ground',
        })
        meshMaterials.push(material)
        group.add(new THREE.Mesh(geometry, material))
      }
      const label = makeLabel(body.name, spriteMaterials, labelTextures)
      const showAtMount = body.showLabel
      label.visible = showAtMount
      const labelMaterial = label.material as THREE.SpriteMaterial
      labelMaterial.opacity = showAtMount ? 1 : 0
      label.userData.prevShowLabel = showAtMount
      label.userData.fadeStart = null
      group.userData.label = label
      group.add(label)
      place(group, body)
      scene.add(group)
      objects.set(body.id, group)
    }

    const resize = () => {
      const w = el.clientWidth || 320
      const h = el.clientHeight || 224
      renderer.setSize(w, h, false)
      camera.aspect = w / Math.max(h, 1)
      camera.updateProjectionMatrix()
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(el)
    el.appendChild(renderer.domElement)

    function onWheel(event: WheelEvent) {
      event.preventDefault()
      event.stopPropagation()
      const distance = camera.position.distanceTo(TARGET)
      setCameraDistance(camera, zoomDistance(distance, event.deltaY < 0 ? 'in' : 'out'))
      controls.update()
    }
    function onPointerDown(event: PointerEvent) {
      event.stopPropagation()
    }
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false })
    renderer.domElement.addEventListener('pointerdown', onPointerDown)

    let frame = 0
    const tick = () => {
      for (const body of sceneAt(explodeRef.current)) {
        const object = objects.get(body.id)
        if (!object) continue
        place(object, body)
        const sprite = object.userData.label as THREE.Sprite | undefined
        if (sprite) {
          const material = sprite.material as THREE.SpriteMaterial
          const show = body.showLabel
          const prevShow = sprite.userData.prevShowLabel === true
          if (!show) {
            sprite.visible = false
            material.opacity = 0
            sprite.userData.prevShowLabel = false
            sprite.userData.fadeStart = null
          } else {
            sprite.visible = true
            if (!prevShow) {
              if (prefersReducedMotion()) {
                material.opacity = 1
                sprite.userData.fadeStart = null
              } else {
                material.opacity = 0
                sprite.userData.fadeStart = performance.now()
              }
            }
            const fadeStart = sprite.userData.fadeStart as number | null
            if (fadeStart != null) {
              const elapsed = performance.now() - fadeStart
              const linear = Math.min(1, elapsed / LABEL_FADE_MS)
              material.opacity = cssEaseOut(linear)
              if (linear >= 1) sprite.userData.fadeStart = null
            } else if (material.opacity < 1) {
              material.opacity = 1
            }
            sprite.userData.prevShowLabel = true
          }
        }
      }
      controls.update()
      renderer.render(scene, camera)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      renderer.domElement.removeEventListener('wheel', onWheel)
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      geometries.forEach((geometry) => geometry.dispose())
      meshMaterials.forEach((material) => material.dispose())
      spriteMaterials.forEach((material) => material.dispose())
      labelTextures.forEach((texture) => texture.dispose())
      controls.dispose()
      controlsRef.current = null
      cameraRef.current = null
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={host} style={{ width, height }} data-wf-view="" />
})

export default WfSchematicView
