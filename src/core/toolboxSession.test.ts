import { describe, expect, it } from 'vitest'
import { destinationPoint } from './projection'
import {
  acceptClick,
  acceptDoubleClick,
  chooseTool,
  closedSession,
  commitLasso,
  deleteDraft,
  doneDraft,
  takeDraft,
  toggleMenu,
} from './toolboxSession'

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

  it('asks the map to sample a lasso click and stores the ring', () => {
    const session = chooseTool(closedSession(), 'lasso')
    const click = acceptClick(session, a)
    expect(click.sample).toBe(true)
    const traced = commitLasso(click.session, [a, b, c], null)
    expect(traced.lasso?.status).toBe('ready')
    expect(takeDraft(traced).draft?.sourceName).toBe('Lasso')
    const missed = commitLasso(click.session, [], 'No feature found at that contrast.')
    expect(missed.lasso?.message).toBe('No feature found at that contrast.')
    expect(takeDraft(missed).draft).toBeNull()
  })

  it('clears a drawing without returning a draft', () => {
    const session = acceptClick(chooseTool(closedSession(), 'ruler'), a).session
    const cleared = deleteDraft(session)
    expect(cleared.tool).toBeNull()
    expect(cleared.ruler).toBeNull()
  })
})
