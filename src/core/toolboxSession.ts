import { beginCircle, circleRadiusM, circleRing, CircleDraft, setCircleCentre, setCircleEdge } from './circle'
import { beginLasso, commitLassoRing, LassoDraft, setLassoAim } from './lasso'
import {
  addCorner,
  applyDoubleClick,
  beginMeasurement,
  finishRuler,
  measuredPolygonDraft,
  Measurement,
} from './measurement'
import { ringToDraft, RingDraft } from './ringDraft'
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

export type ToolId = 'polygon' | 'ruler' | 'lasso' | 'circle' | 'square'

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
  if (tool === 'lasso') next.lasso = beginLasso()
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
  if (session.tool === 'lasso' && session.lasso?.status === 'aim') {
    return { session, sample: true }
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
  return session
}

export function acceptHover(session: ToolboxSession, corner: LngLat): ToolboxSession {
  if (session.circle?.status === 'centre' && session.circle.centre) return { ...session, hover: corner }
  if (session.square?.status === 'origin' && session.square.origin) return { ...session, hover: corner }
  return session
}

export function deleteDraft(session: ToolboxSession): ToolboxSession {
  return closedSession()
}

export function doneDraft(session: ToolboxSession): ToolboxSession {
  if (session.polygon) return { ...session, polygon: finishRuler(session.polygon) }
  if (session.ruler) return { ...session, ruler: finishDistanceRuler(session.ruler) }
  return session
}

export function setLassoSettings(session: ToolboxSession, radiusPx: number, maxChannelDelta: number): ToolboxSession {
  if (!session.lasso || session.lasso.status !== 'aim') return session
  return { ...session, lasso: setLassoAim(session.lasso, radiusPx, maxChannelDelta) }
}

export function setSquareMode(session: ToolboxSession, shape: BoxShape): ToolboxSession {
  if (!session.square) return session
  return { ...session, square: setSquareShape(session.square, shape) }
}

export function commitLasso(session: ToolboxSession, corners: LngLat[], message: string | null): ToolboxSession {
  if (!session.lasso) return session
  return { ...session, lasso: commitLassoRing(session.lasso, corners, message), hover: null }
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
  if (session.lasso?.status === 'ready') {
    const draft = ringToDraft(session.lasso.corners, 'Lasso')
    return { session: draft ? closedSession() : session, draft }
  }
  return { session, draft: null }
}

export function overlayOf(session: ToolboxSession): { corners: LngLat[]; closed: boolean } {
  if (session.polygon) {
    return { corners: session.polygon.corners, closed: session.polygon.status === 'polygon' }
  }
  if (session.ruler) return { corners: session.ruler.corners, closed: false }
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
  if (session.lasso) return { corners: session.lasso.corners, closed: session.lasso.corners.length >= 3 }
  return { corners: [], closed: false }
}
