import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import MapToolCursor from './MapToolCursor'

describe('MapToolCursor', () => {
  it('uses a crosshair for outline and a ring for dynamic', () => {
    const outline = render(<MapToolCursor tool="lasso" lassoBehaviour="outline" x={10} y={10} />)
    expect(outline.container.querySelector('line')).not.toBeNull()
    outline.unmount()
    const dynamic = render(<MapToolCursor tool="lasso" lassoBehaviour="dynamic" lassoRadiusPx={48} x={10} y={10} />)
    expect(dynamic.container.querySelector('line')).toBeNull()
    expect(dynamic.container.querySelector('circle')).not.toBeNull()
  })
})
