import { beginCircle, circleRadiusM, circleRing, CircleDraft, setCircleCentre, setCircleEdge } from './circle'
import {
  appendGuidePoint,
  beginLasso,
  closeGuide,
  dropLastGuidePoint,
  LassoBehaviour,
  LassoDraft,
  markLassoMessage,
  paintGuideSample,
  Pixel,
  setLassoAim,
  setLassoBehaviour,
  setOutline,
} from './lasso'
import {
  addCorner,
  applyDoubleClick,
  beginMeasurement,
  finishRuler,
  insertMeasuredCorner,
  measuredPolygonDraft,
  Measurement,
  moveMeasuredCorner,
  removeMeasuredCorner,
} from './measurement'
import { insertOnSide, moveCorner, removeCorner, VERTEX_FLOOR } from './ringEdit'
import { ringsToDraft, ringToDraft, RingDraft } from './ringDraft'
import { addRulerCorner, beginRuler, finishDistanceRuler, Ruler } from './ruler'
import {
  beginSquare,
  BoxShape,
  setSquareOpposite,
  setSquareOrigin,
  setSquareShape,
  squareCorners,
  SquareDraft,
} from './square'
import { LngLat } from './types'

export type ToolId = 'polygon' | 'ruler' | 'lasso' | 'brush' | 'circle' | 'square'

export function usesLassoDraft(tool: ToolId | null): boolean {
  return tool === 'lasso' || tool === 'brush'
}

export interface ToolboxSession {
  menuOpen: boolean
  tool: ToolId | null
  blockedMessage: string | null
  polygon: Measurement | null
  ruler: Ruler | null
  circle: CircleDraft | null
  square: SquareDraft | null
  lasso: LassoDraft | null
  hover: LngLat | null
}

export function closedSession(): ToolboxSession {
  return {
    menuOpen: false,
    tool: null,
    blockedMessage: null,
    polygon: null,
    ruler: null,
    circle: null,
    square: null,
    lasso: null,
    hover: null,
  }
}

export function toggleMenu(session: ToolboxSession): ToolboxSession {
  return { ...session, menuOpen: !session.menuOpen, blockedMessage: null }
}

export function chooseTool(session: ToolboxSession, tool: ToolId): ToolboxSession {
  if (session.tool && session.tool !== tool) {
    return { ...session, blockedMessage: 'Delete the current drawing before choosing another tool.' }
  }
  if (session.tool === tool) return { ...session, menuOpen: false, blockedMessage: null }
  const next = { ...closedSession(), tool, menuOpen: false }
  if (tool === 'polygon') next.polygon = beginMeasurement()
  if (tool === 'ruler') next.ruler = beginRuler()
  if (tool === 'circle') next.circle = beginCircle()
  if (tool === 'square') next.square = beginSquare()
  if (tool === 'lasso') next.lasso = setLassoBehaviour(beginLasso(), 'outline')
  if (tool === 'brush') next.lasso = beginLasso()
  return next
}

export function acceptClick(session: ToolboxSession, corner: LngLat): { session: ToolboxSession; sample: boolean } {
  if (session.tool === 'polygon' && session.polygon) {
    return { session: { ...session, polygon: addCorner(session.polygon, corner) }, sample: false }
  }
  if (session.tool === 'ruler' && session.ruler) {
    return { session: { ...session, ruler: addRulerCorner(session.ruler, corner) }, sample: false }
  }
  if (session.tool === 'circle' && session.circle) {
    const circle = session.circle.centre
      ? setCircleEdge(session.circle, corner)
      : setCircleCentre(session.circle, corner)
    return { session: { ...session, circle, hover: circle.status === 'ready' ? null : session.hover }, sample: false }
  }
  if (session.tool === 'square' && session.square) {
    const square = session.square.origin
      ? setSquareOpposite(session.square, corner)
      : setSquareOrigin(session.square, corner)
    return { session: { ...session, square, hover: square.status === 'ready' ? null : session.hover }, sample: false }
  }
  if (usesLassoDraft(session.tool) && session.lasso?.status === 'drawing') {
    const sample = session.lasso.behaviour !== 'outline'
    return { session: { ...session, lasso: appendGuidePoint(session.lasso, corner) }, sample }
  }
  return { session, sample: false }
}

export function acceptDoubleClick(session: ToolboxSession, corner: LngLat): ToolboxSession {
  if (session.tool === 'polygon' && session.polygon) {
    const polygon = applyDoubleClick(session.polygon, corner)
    if (!polygon) return deleteDraft(session)
    return { ...session, polygon }
  }
  if (session.tool === 'ruler' && session.ruler) {
    return { ...session, ruler: finishDistanceRuler(session.ruler) }
  }
  if (usesLassoDraft(session.tool) && session.lasso) return closeLasso(session)
  return session
}

export function acceptHover(session: ToolboxSession, corner: LngLat): ToolboxSession {
  if (session.polygon) return { ...session, hover: session.polygon.status === 'adding' ? corner : null }
  if (session.ruler) return { ...session, hover: session.ruler.status === 'adding' ? corner : null }
  if (session.circle?.status === 'centre' && session.circle.centre) return { ...session, hover: corner }
  if (session.square?.status === 'origin' && session.square.origin) return { ...session, hover: corner }
  return session
}

export function deleteDraft(_session: ToolboxSession): ToolboxSession {
  return closedSession()
}

export function doneDraft(session: ToolboxSession): ToolboxSession {
  if (session.polygon) return { ...session, polygon: finishRuler(session.polygon) }
  if (session.ruler) return { ...session, ruler: finishDistanceRuler(session.ruler) }
  return session
}

export function setSessionLassoBehaviour(session: ToolboxSession, behaviour: LassoBehaviour): ToolboxSession {
  if (!session.lasso) return session
  if (session.tool === 'lasso' && behaviour !== 'outline') return session
  if (session.tool === 'brush' && behaviour === 'outline') return session
  return { ...session, lasso: setLassoBehaviour(session.lasso, behaviour) }
}

export function insertLassoVertex(session: ToolboxSession, part: number, side: number, point: LngLat): ToolboxSession {
  const draft = session.lasso
  if (!draft || draft.status !== 'closed') return session
  const ring = draft.parts[part]
  if (!ring) return session
  const parts = draft.parts.slice()
  parts[part] = insertOnSide(ring, side, point)
  return { ...session, lasso: { ...draft, parts, message: null } }
}

export function removeLassoVertex(session: ToolboxSession, part: number, corner: number): ToolboxSession {
  const draft = session.lasso
  if (!draft || draft.status !== 'closed') return session
  const ring = draft.parts[part]
  if (!ring) return session
  const next = removeCorner(ring, corner)
  if (!next) return { ...session, lasso: { ...draft, message: VERTEX_FLOOR } }
  const parts = draft.parts.slice()
  parts[part] = next
  return { ...session, lasso: { ...draft, parts, message: null } }
}

export function insertPolygonVertex(session: ToolboxSession, side: number, point: LngLat): ToolboxSession {
  if (!session.polygon) return session
  return { ...session, polygon: insertMeasuredCorner(session.polygon, side, point) }
}

export function movePolygonVertex(session: ToolboxSession, corner: number, point: LngLat): ToolboxSession {
  if (!session.polygon) return session
  const polygon = moveMeasuredCorner(session.polygon, corner, point)
  if (polygon === session.polygon) return session
  return { ...session, polygon }
}

export function moveLassoVertex(session: ToolboxSession, part: number, corner: number, point: LngLat): ToolboxSession {
  const draft = session.lasso
  if (!draft || draft.status !== 'closed') return session
  const ring = draft.parts[part]
  if (!ring) return session
  const next = moveCorner(ring, corner, point)
  if (next === ring) return session
  const parts = draft.parts.slice()
  parts[part] = next
  return { ...session, lasso: { ...draft, parts, message: null } }
}

export function removePolygonVertex(session: ToolboxSession, corner: number): ToolboxSession {
  if (!session.polygon) return session
  return { ...session, polygon: removeMeasuredCorner(session.polygon, corner) }
}

export function vertexRings(session: ToolboxSession): LngLat[][] {
  if (session.polygon?.status === 'polygon' && session.polygon.corners.length >= 3) {
    return [session.polygon.corners.map((point) => ({ lng: point.lng, lat: point.lat }))]
  }
  if (session.lasso?.status === 'closed') {
    return session.lasso.parts
      .filter((part) => part.length >= 3)
      .map((part) => part.map((point) => ({ lng: point.lng, lat: point.lat })))
  }
  return []
}

export function setLassoSettings(session: ToolboxSession, radiusPx: number, maxChannelDelta: number): ToolboxSession {
  if (!session.lasso) return session
  return { ...session, lasso: setLassoAim(session.lasso, radiusPx, maxChannelDelta) }
}

export function paintLassoSample(session: ToolboxSession, index: number, pixel: Pixel): ToolboxSession {
  if (!session.lasso) return session
  return { ...session, lasso: paintGuideSample(session.lasso, index, pixel) }
}

export function setLassoOutline(session: ToolboxSession, parts: LngLat[][]): ToolboxSession {
  if (!session.lasso) return session
  return { ...session, lasso: setOutline(session.lasso, parts) }
}

export function noteLasso(session: ToolboxSession, message: string): ToolboxSession {
  if (!session.lasso) return session
  return { ...session, lasso: markLassoMessage(session.lasso, message) }
}

export function dropLastLassoPoint(session: ToolboxSession): ToolboxSession {
  if (!session.lasso) return session
  return { ...session, lasso: dropLastGuidePoint(session.lasso) }
}

export function closeLasso(session: ToolboxSession): ToolboxSession {
  if (!session.lasso) return session
  return { ...session, lasso: closeGuide(session.lasso), hover: null }
}

export function setSquareMode(session: ToolboxSession, shape: BoxShape): ToolboxSession {
  if (!session.square) return session
  return { ...session, square: setSquareShape(session.square, shape) }
}

export function takeDraft(session: ToolboxSession): { session: ToolboxSession; draft: RingDraft | null } {
  if (session.polygon) {
    const measured = measuredPolygonDraft(session.polygon)
    if (!measured) return { session, draft: null }
    return { session: closedSession(), draft: measured }
  }
  if (session.circle?.status === 'ready' && session.circle.centre && session.circle.edge) {
    const radius = circleRadiusM(session.circle.centre, session.circle.edge)
    const draft = ringToDraft(circleRing(session.circle.centre, radius), 'Circle')
    return { session: draft ? closedSession() : session, draft }
  }
  if (session.square?.status === 'ready' && session.square.origin && session.square.opposite) {
    const corners = squareCorners(session.square.origin, session.square.opposite, session.square.shape)
    const name = session.square.shape === 'square' ? 'Square' : 'Rectangle'
    const draft = corners ? ringToDraft(corners, name) : null
    return { session: draft ? closedSession() : session, draft }
  }
  return { session, draft: null }
}

export function takeLassoPair(
  session: ToolboxSession,
  pairId: string,
): { session: ToolboxSession; movable: RingDraft | null; fixed: RingDraft | null } {
  const parts = session.lasso?.parts.filter((part) => part.length >= 3) ?? []
  if (!session.lasso || parts.length === 0) return { session, movable: null, fixed: null }
  if (session.lasso.message === 'This basemap does not allow colour sampling.') {
    return { session, movable: null, fixed: null }
  }
  const movable = ringsToDraft(parts, 'Lasso')
  const fixed = ringsToDraft(parts, 'Lasso (fixed)')
  if (!movable || !fixed) return { session, movable: null, fixed: null }
  return {
    session: closedSession(),
    movable: { ...movable, pairId },
    fixed: { ...fixed, pairId, fixed: true },
  }
}

export interface ToolboxOverlay {
  corners: LngLat[]
  closed: boolean
  /** Confirmed corners plus the hover point while Polygon or Ruler is still adding. */
  preview?: LngLat[]
  guide?: LngLat[]
  guideClosed?: boolean
  parts?: LngLat[][]
}

function rubberBand(status: string, corners: LngLat[], hover: LngLat | null): LngLat[] | undefined {
  if (status !== 'adding' || corners.length < 1 || !hover) return undefined
  return [...corners, hover]
}

export function overlayOf(session: ToolboxSession): ToolboxOverlay {
  if (session.polygon) {
    const preview = rubberBand(session.polygon.status, session.polygon.corners, session.hover)
    return {
      corners: session.polygon.corners,
      closed: session.polygon.status === 'polygon',
      ...(preview ? { preview } : {}),
    }
  }
  if (session.ruler) {
    const preview = rubberBand(session.ruler.status, session.ruler.corners, session.hover)
    return {
      corners: session.ruler.corners,
      closed: false,
      ...(preview ? { preview } : {}),
    }
  }
  if (session.circle?.centre) {
    const edge = session.circle.edge ?? session.hover
    if (!edge) return { corners: [], closed: false }
    const radius = circleRadiusM(session.circle.centre, edge)
    if (radius < 1) return { corners: [], closed: false }
    return { corners: circleRing(session.circle.centre, radius), closed: true }
  }
  if (session.square?.origin) {
    const opposite = session.square.opposite ?? session.hover
    if (!opposite) return { corners: [], closed: false }
    return { corners: squareCorners(session.square.origin, opposite, session.square.shape) ?? [], closed: true }
  }
  if (session.lasso) {
    const outlineClosed = session.lasso.behaviour === 'outline' && session.lasso.status === 'closed'
    return {
      corners: [],
      closed: false,
      ...(outlineClosed
        ? {}
        : {
            guide: session.lasso.guide,
            guideClosed: session.lasso.status === 'closed' && session.lasso.guide.length >= 3,
          }),
      parts: session.lasso.parts.filter((part) => part.length >= 2),
    }
  }
  return { corners: [], closed: false }
}
