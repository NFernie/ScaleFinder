import { describe, expect, it } from 'vitest'
import { destinationPoint } from './projection'
import {
  acceptClick,
  acceptDoubleClick,
  acceptHover,
  chooseTool,
  closedSession,
  deleteDraft,
  doneDraft,
  overlayOf,
  setLassoOutline,
  setLassoSettings,
  takeDraft,
  takeLassoPair,
  toggleMenu,
} from './toolboxSession'
import { removePolygon, type PolygonItem } from './polygonList'

const a = { lng: 10, lat: 45 }
const b = destinationPoint(a, 1000, 90)
const c = destinationPoint(b, 1000, 0)

describe('toolbox session', () => {
  it('opens the menu and starts Polygon without replacing a draft', () => {
    const open = toggleMenu(closedSession())
    expect(open.menuOpen).toBe(true)
    const polygon = chooseTool(open, 'polygon')
    expect(polygon.menuOpen).toBe(false)
    expect(polygon.tool).toBe('polygon')
    expect(polygon.polygon?.status).toBe('adding')
    const blocked = chooseTool(polygon, 'ruler')
    expect(blocked.tool).toBe('polygon')
    expect(blocked.blockedMessage).toBe('Delete the current drawing before choosing another tool.')
  })

  it('keeps Polygon on the current close and add path', () => {
    let session = chooseTool(closedSession(), 'polygon')
    session = acceptClick(session, a).session
    session = acceptClick(session, b).session
    session = acceptClick(session, c).session
    session = acceptDoubleClick(session, c)
    expect(session.polygon?.status).toBe('polygon')
    const taken = takeDraft(session)
    expect(taken.draft?.sourceName).toBe('Measured Polygon')
    expect(taken.session.tool).toBeNull()
  })

  it('finishes a ruler without an area draft', () => {
    let session = chooseTool(closedSession(), 'ruler')
    session = acceptClick(session, a).session
    session = acceptClick(session, b).session
    session = acceptDoubleClick(session, b)
    expect(session.ruler?.status).toBe('done')
    expect(takeDraft(session).draft).toBeNull()
    expect(doneDraft(acceptClick(chooseTool(closedSession(), 'ruler'), a).session).ruler?.message).toBe(
      'Add at least two points.',
    )
  })

  it('appends lasso guide points and stores a movable and fixed pair', () => {
    let session = chooseTool(closedSession(), 'lasso')
    const drag = acceptClick(session, a)
    expect(drag.sample).toBe(true)
    session = acceptClick(drag.session, b).session
    expect(session.lasso?.status).toBe('drawing')
    expect(session.lasso?.guide).toEqual([a, b])
    const tuned = setLassoSettings(session, 4, 400)
    expect(tuned.lasso?.radiusPx).toBe(8)
    expect(tuned.lasso?.samples[0]?.radiusPx).toBe(48)
    expect(tuned.lasso?.samples[1]?.radiusPx).toBe(48)
    const tooFew = acceptDoubleClick(tuned, b)
    expect(tooFew.lasso?.status).toBe('drawing')
    expect(tooFew.lasso?.guide).toEqual([a, b])
    expect(tooFew.lasso?.message).toBe('Add at least three corners to close a polygon.')
    session = acceptClick(tooFew, c).session
    const d = destinationPoint(c, 1000, 180)
    session = acceptClick(session, d).session
    session = setLassoOutline(session, [[a, b, c]])
    session = acceptDoubleClick(session, d)
    expect(session.lasso?.status).toBe('closed')
    expect(session.lasso?.guide).toEqual([a, b, c, d])
    const taken = takeLassoPair(session, 'pair-1')
    expect(taken.movable?.sourceName).toBe('Lasso')
    expect(taken.fixed?.sourceName).toBe('Lasso (fixed)')
    expect(taken.movable?.pairId).toBe('pair-1')
    expect(taken.fixed?.pairId).toBe('pair-1')
    expect(taken.fixed?.fixed).toBe(true)
    expect(taken.movable?.fixed).toBeUndefined()
    expect(taken.movable?.raw).toHaveLength(3)
    expect(taken.movable?.anchor).toEqual(taken.fixed?.anchor)
    expect(taken.session.tool).toBeNull()
    const rows: PolygonItem[] = [
      {
        id: 'move',
        sourceName: 'Lasso',
        raw: taken.movable!.raw,
        unit: 'm',
        hasZ: false,
        selected: true,
        anchor: taken.movable!.anchor,
        colour: '#2dd4bf',
        pairId: 'pair-1',
      },
      {
        id: 'fixed',
        sourceName: 'Lasso (fixed)',
        raw: taken.fixed!.raw,
        unit: 'm',
        hasZ: false,
        selected: true,
        anchor: taken.fixed!.anchor,
        colour: '#2dd4bf',
        pairId: 'pair-1',
        fixed: true,
      },
    ]
    expect(removePolygon(rows, 'fixed').map((row) => row.id)).toEqual([])
    expect(removePolygon(rows, 'move').map((row) => row.id)).toEqual([])
    expect(setLassoSettings(session, 80, 4).lasso?.radiusPx).toBe(8)
  })

  it('includes hover preview for an open polygon', () => {
    let session = chooseTool(closedSession(), 'polygon')
    session = acceptClick(session, a).session
    session = acceptClick(session, b).session
    session = acceptHover(session, c)
    const overlay = overlayOf(session)
    expect(overlay.preview).toEqual([a, b, c])
    expect(overlay.corners).toEqual([a, b])
    expect(overlay.closed).toBe(false)
  })

  it('omits preview once a polygon is closed', () => {
    let session = chooseTool(closedSession(), 'polygon')
    session = acceptClick(session, a).session
    session = acceptClick(session, b).session
    session = acceptClick(session, c).session
    session = acceptDoubleClick(session, c)
    session = acceptHover(session, c)
    const overlay = overlayOf(session)
    expect(session.polygon?.status).toBe('polygon')
    expect(overlay.preview).toBeUndefined()
    expect(overlay.corners).toEqual(session.polygon?.corners)
    expect(overlay.closed).toBe(true)
  })

  it('includes hover preview for an open ruler and drops it when the ruler is done', () => {
    let session = chooseTool(closedSession(), 'ruler')
    session = acceptClick(session, a).session
    session = acceptHover(session, b)
    expect(overlayOf(session).preview).toEqual([a, b])
    expect(overlayOf(session).corners).toEqual([a])
    session = acceptClick(session, b).session
    session = acceptDoubleClick(session, b)
    session = acceptHover(session, c)
    expect(session.ruler?.status).toBe('done')
    expect(session.hover).toBeNull()
    expect(overlayOf(session).preview).toBeUndefined()
    expect(overlayOf(session).corners).toEqual([a, b])
  })

  it('clears a drawing without returning a draft', () => {
    const session = acceptClick(chooseTool(closedSession(), 'ruler'), a).session
    const cleared = deleteDraft(session)
    expect(cleared.tool).toBeNull()
    expect(cleared.ruler).toBeNull()
  })
})
