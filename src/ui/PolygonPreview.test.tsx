import { render } from '@testing-library/react'
import PolygonPreview from './PolygonPreview'

function nums(value: string | null): number[] {
  return (value ?? '').trim().split(/[\s,]+/).map(Number)
}

describe('PolygonPreview', () => {
  it('fills an open part and stops the stroke 8px short of each end', () => {
    const { container } = render(
      <PolygonPreview
        size={96}
        parts={[
          [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 100, y: 100 },
          ],
        ]}
      />,
    )
    const fill = container.querySelector('polygon')
    const stroke = container.querySelector('polyline')
    expect(fill).not.toBeNull()
    expect(stroke).not.toBeNull()
    const strokeNums = nums(stroke?.getAttribute('points') ?? null)
    expect(strokeNums[0]).toBeCloseTo(24, 0)
    expect(strokeNums[1]).toBeCloseTo(80, 0)
    expect(strokeNums[strokeNums.length - 2]).toBeCloseTo(80, 0)
    expect(strokeNums[strokeNums.length - 1]).toBeCloseTo(24, 0)
    const fillNums = nums(fill?.getAttribute('points') ?? null)
    expect(fillNums[0]).toBeCloseTo(16, 0)
    expect(fillNums[1]).toBeCloseTo(80, 0)
  })

  it('does not inset a closed part', () => {
    const { container } = render(
      <PolygonPreview
        size={96}
        parts={[
          [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 100, y: 100 },
            { x: 0, y: 0 },
          ],
        ]}
      />,
    )
    const stroke = nums(container.querySelector('polyline')?.getAttribute('points') ?? null)
    expect(stroke[0]).toBeCloseTo(16, 0)
    expect(stroke[1]).toBeCloseTo(80, 0)
  })

  it('draws two parts as separate strokes and a two-vertex part as a line', () => {
    const { container } = render(
      <PolygonPreview
        size={96}
        parts={[
          [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
          ],
          [
            { x: 50, y: 50 },
            { x: 80, y: 50 },
            { x: 80, y: 80 },
          ],
        ]}
      />,
    )
    expect(container.querySelectorAll('polyline')).toHaveLength(2)
    expect(container.querySelectorAll('polygon')).toHaveLength(1)
  })
})
