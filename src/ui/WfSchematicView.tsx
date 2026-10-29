import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { sceneAt as asymSceneAt } from '../core/asymWfSchematic'
import { DELTA_PLAIN_COLOUR, deltaPlainShape } from '../core/deltaplain'
import { beachRidgeMesh, channelMesh, ridgeFlankSide, type SchematicSceneId } from '../core/schematicScene'
import { sceneAt as tfwSceneAt } from '../core/tfwEcsSchematic'
import {
  GROUND_THICKNESS,
  sceneAt as wfSceneAt,
  WATER_COLOUR,
  WATER_OPACITY,
  WATER_SLAB_DEPTH,
  WATER_SLAB_WIDTH,
  type PlacedBody,
  type SolidKind,
} from '../core/wfSchematic'
import { asymmetricBeachRidgeGeometry } from './asymmetricBeachRidgeGeometry'
import { deltaPlainGeometry } from './deltaplain'
import { beachRidgeGeometry } from './beachRidgeGeometry'
import { brConvexSwGeometry } from './brConvexSwgeometry'
import { halfChannelGeometry } from './halfChannelGeometry'
import { mouthBarGeometry } from './mouthBarGeometry'
import { TIDAL_CHANNEL_OPACITY, tidalChannelGeometry } from './tidalChannelGeometry'
import { cssEaseOut } from '../core/cssEaseOut'
import {
  cameraPositionAtDistance,
  schematicDrag,
  ZOOM_MAX,
  ZOOM_MIN,
  wheelZoomStep,
  zoomDistance,
} from './schematicFrame'

const TARGET = new THREE.Vector3(0, 0.4, 0.6)

const LABEL_FADE_MS = 120

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

function setCameraDistance(camera: THREE.PerspectiveCamera, target: THREE.Vector3, distance: number) {
  const next = cameraPositionAtDistance(camera.position, target, distance)
  camera.position.set(next.x, next.y, next.z)
}

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  if (target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return true
  if (target.tagName !== 'INPUT') return false
  const type = (target as HTMLInputElement).type
  return type !== 'range' && type !== 'button' && type !== 'checkbox' && type !== 'radio'
}

const COLOUR: Record<SolidKind, number> = {
  ground: WATER_COLOUR,
  channel: 0xf97316,
  'mouth-bar': 0x4ade80,
  'beach-ridge': 0xeab308,
  'delta-plain': DELTA_PLAIN_COLOUR,
  group: 0xe2e8f0,
}

function layoutAt(scene: SchematicSceneId, explode: number): PlacedBody[] {
  if (scene === 'asym') return asymSceneAt(explode)
  if (scene === 'tfw') return tfwSceneAt(explode)
  return wfSceneAt(explode)
}

function geometryFor(scene: SchematicSceneId, body: PlacedBody): THREE.BufferGeometry {
  if (body.kind === 'ground') {
    const width = body.groundSpan?.width ?? WATER_SLAB_WIDTH
    const depth = body.groundSpan?.depth ?? WATER_SLAB_DEPTH
    return new THREE.BoxGeometry(width, GROUND_THICKNESS, depth)
  }
  if (body.kind === 'channel') {
    if (body.channelLength != null) return halfChannelGeometry(body.channelLength)
    return channelMesh(scene) === 'tidal' ? tidalChannelGeometry() : halfChannelGeometry()
  }
  if (body.kind === 'mouth-bar') return mouthBarGeometry()
  if (body.kind === 'delta-plain') return deltaPlainGeometry(deltaPlainShape(scene, layoutAt(scene, 0)))
  if (body.kind === 'beach-ridge') {
    const index = Number(body.id.slice(body.id.lastIndexOf('-') + 1))
    const side = ridgeFlankSide(body.id)
    const ridgeIndex = Number.isFinite(index) ? index : 0
    const loft = beachRidgeMesh(scene, body.id)
    if (loft === 'convex-sw') return brConvexSwGeometry(side, ridgeIndex)
    if (loft === 'asymmetric') return asymmetricBeachRidgeGeometry(side, ridgeIndex)
    return beachRidgeGeometry(side, ridgeIndex)
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

/** NaN has no band. Every other value is clamped inside sceneAt, which still returns every body. */
function explodeForScene(value: number): number {
  return Number.isFinite(value) ? value : 0
}

const WfSchematicView = forwardRef<
  SchematicCameraHandle,
  { scene: SchematicSceneId; explode: number; width: number; height: number; onUnavailable?: () => void }
>(function WfSchematicView({ scene, explode, width, height, onUnavailable }, ref) {
  const host = useRef<HTMLDivElement>(null)
  const explodeRef = useRef(explode)
  explodeRef.current = explode
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const onUnavailableRef = useRef(onUnavailable)
  onUnavailableRef.current = onUnavailable

  useImperativeHandle(
    ref,
    () => ({
      zoomBy(direction: 'in' | 'out') {
        const camera = cameraRef.current
        const controls = controlsRef.current
        if (!camera || !controls) return
        const distance = camera.position.distanceTo(controls.target)
        setCameraDistance(camera, controls.target, zoomDistance(distance, direction))
        controls.update()
      },
    }),
    [],
  )

  useEffect(() => {
    const el = host.current
    if (!el) return
    let created: THREE.WebGLRenderer | null = null
    try {
      created = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      if (!created.getContext()) throw new Error('WebGL unavailable')
    } catch {
      created?.dispose()
      onUnavailableRef.current?.()
      return
    }
    const renderer = created
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.touchAction = 'none'
    const world = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
    camera.position.set(6.5, 5.5, 7.5)
    camera.lookAt(TARGET)
    cameraRef.current = camera
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.copy(TARGET)
    controls.enablePan = false
    controls.enableZoom = false
    controls.enableDamping = false
    controls.screenSpacePanning = true
    controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE
    controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE
    controls.minDistance = ZOOM_MIN
    controls.maxDistance = ZOOM_MAX
    controls.update()
    const applyDrag = (spaceHeld: boolean) => {
      const mode = schematicDrag(spaceHeld)
      controls.enablePan = mode === 'pan'
      controls.mouseButtons.LEFT = mode === 'pan' ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE
      renderer.domElement.style.cursor = mode === 'pan' ? 'grab' : ''
    }
    controlsRef.current = controls
    world.add(new THREE.AmbientLight(0xffffff, 0.35))
    world.add(new THREE.HemisphereLight(0xe2e8f0, 0x64748b, 0.65))
    const sun = new THREE.DirectionalLight(0xffffff, 1.15)
    sun.position.set(5, 7, -2)
    world.add(sun)

    const objects = new Map<string, THREE.Object3D>()
    const geometries: THREE.BufferGeometry[] = []
    const meshMaterials: THREE.Material[] = []
    const spriteMaterials: THREE.SpriteMaterial[] = []
    const labelTextures: THREE.Texture[] = []
    for (const body of layoutAt(scene, 0)) {
      const group = new THREE.Group()
      if (body.kind !== 'group') {
        const geometry = geometryFor(scene, body)
        geometries.push(geometry)
        const tidalChannel =
          body.kind === 'channel' && body.channelLength == null && channelMesh(scene) === 'tidal'
        const material = new THREE.MeshStandardMaterial({
          color: COLOUR[body.kind],
          roughness: 0.72,
          flatShading: body.kind === 'beach-ridge',
          transparent: body.kind === 'ground' || tidalChannel,
          opacity: body.kind === 'ground' ? WATER_OPACITY : tidalChannel ? TIDAL_CHANNEL_OPACITY : 1,
          depthWrite: body.kind !== 'ground' && !tidalChannel,
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
      world.add(group)
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

    let wheelAccum = 0
    function onWheel(event: WheelEvent) {
      event.preventDefault()
      event.stopPropagation()
      const step = wheelZoomStep(wheelAccum, event)
      wheelAccum = step.accumulator
      if (!step.direction) return
      const distance = camera.position.distanceTo(controls.target)
      setCameraDistance(camera, controls.target, zoomDistance(distance, step.direction))
      controls.update()
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.code !== 'Space') return
      if (isTextEntry(event.target)) return
      event.preventDefault()
      if (event.repeat) return
      applyDrag(true)
    }
    function onKeyUp(event: KeyboardEvent) {
      if (event.code !== 'Space') return
      applyDrag(false)
    }
    function onWindowBlur() {
      applyDrag(false)
    }
    function onPointerDown(event: PointerEvent) {
      event.stopPropagation()
    }
    function onPointerLeave() {
      wheelAccum = 0
    }
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false })
    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointerleave', onPointerLeave)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onWindowBlur)

    let frame = 0
    const tick = () => {
      for (const body of layoutAt(scene, explodeForScene(explodeRef.current))) {
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
      renderer.render(world, camera)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      wheelAccum = 0
      renderer.domElement.removeEventListener('wheel', onWheel)
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onWindowBlur)
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
  }, [scene])

  return <div ref={host} style={{ width, height }} data-wf-view="" />
})

export default WfSchematicView
