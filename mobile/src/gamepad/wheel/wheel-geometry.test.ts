import { describe, expect, it } from 'vitest'
import { angularDistance, normalizeAngle, selectSegment, vectorAngle } from './wheel-geometry'
import type { WheelSegment } from './wheel-segment'

const QUARTER = Math.PI / 2

function segment(id: string, centerAngle: number, halfWidth = Math.PI / 6): WheelSegment {
  return {
    id,
    label: id,
    centerAngle,
    halfWidth,
    availability: 'available',
    bindingId: `binding.${id}`
  }
}

/** Four 60°-wide segments at the compass points, leaving 30° dead arcs between them. */
const compass: readonly WheelSegment[] = [
  segment('north', 0),
  segment('east', QUARTER),
  segment('south', Math.PI),
  segment('west', 3 * QUARTER)
]

describe('normalizeAngle', () => {
  it("wraps into one turn so a segment over twelve o'clock needs no special case", () => {
    expect(normalizeAngle(0)).toBe(0)
    expect(normalizeAngle(-Math.PI / 2)).toBeCloseTo(3 * QUARTER)
    expect(normalizeAngle(Math.PI * 3)).toBeCloseTo(Math.PI)
  })
})

describe('vectorAngle', () => {
  it("measures clockwise from twelve o'clock, with screen Y pointing down", () => {
    expect(vectorAngle(0, -1)).toBeCloseTo(0) // up
    expect(vectorAngle(1, 0)).toBeCloseTo(QUARTER) // right
    expect(vectorAngle(0, 1)).toBeCloseTo(Math.PI) // down
    expect(vectorAngle(-1, 0)).toBeCloseTo(3 * QUARTER) // left
  })

  it('has no angle for a vector with no direction', () => {
    expect(vectorAngle(0, 0)).toBeNull()
  })
})

describe('angularDistance', () => {
  it('takes the short way round, including across the wrap', () => {
    expect(angularDistance(0, 0.1)).toBeCloseTo(0.1)
    expect(angularDistance(0.1, Math.PI * 2 - 0.1)).toBeCloseTo(0.2)
    expect(angularDistance(0, Math.PI)).toBeCloseTo(Math.PI)
  })
})

describe('selectSegment', () => {
  it('selects the segment the stick points at', () => {
    expect(selectSegment(0, -1, compass, 0.2).segmentId).toBe('north')
    expect(selectSegment(1, 0, compass, 0.2).segmentId).toBe('east')
    expect(selectSegment(0, 1, compass, 0.2).segmentId).toBe('south')
    expect(selectSegment(-1, 0, compass, 0.2).segmentId).toBe('west')
  })

  it('selects nothing inside the dead zone, which is what makes centring a cancel', () => {
    const selection = selectSegment(0.1, -0.1, compass, 0.2)

    expect(selection.segmentId).toBeNull()
    // The angle is still reported: the stick has a direction, it just has not committed to it.
    expect(selection.angle).toBeCloseTo(Math.PI / 4)
  })

  it('selects nothing for a null vector, and reports no angle either', () => {
    expect(selectSegment(0, 0, compass, 0.2)).toEqual({
      segmentId: null,
      angle: null,
      magnitude: 0
    })
  })

  it('selects nothing in a dead arc between segments', () => {
    // Exactly between north and east, 45° from each, outside both 30° half-widths.
    expect(selectSegment(0.7, -0.7, compass, 0.2).segmentId).toBeNull()
  })

  it('includes its own edge, so touching segments leave no unselectable seam', () => {
    const touching = [segment('north', 0, Math.PI / 4), segment('east', Math.PI / 2, Math.PI / 4)]

    // Exactly on the shared boundary: one of them must claim it, never neither.
    expect(selectSegment(0.7, -0.7, touching, 0.2).segmentId).not.toBeNull()
  })

  it('selects nothing from an empty preset rather than failing', () => {
    expect(selectSegment(0, -1, [], 0.2)).toEqual({
      segmentId: null,
      angle: 0,
      magnitude: 1
    })
  })

  it("handles a segment that spans twelve o'clock", () => {
    const wrapping = [segment('top', 0, Math.PI / 3)]

    // Just clockwise of twelve, and just anticlockwise of it — both inside the same segment.
    expect(selectSegment(0.4, -0.9, wrapping, 0.2).segmentId).toBe('top')
    expect(selectSegment(-0.4, -0.9, wrapping, 0.2).segmentId).toBe('top')
  })

  it('resolves an overlap by the nearer centre, not by declaration order', () => {
    const overlapping = [segment('wide', 0, Math.PI), segment('narrow', QUARTER, Math.PI / 8)]

    expect(selectSegment(1, 0, overlapping, 0.2).segmentId).toBe('narrow')
    // Away from the narrow one, the wide segment still claims the angle.
    expect(selectSegment(0, -1, overlapping, 0.2).segmentId).toBe('wide')
  })

  it('still selects an unavailable segment, so the wheel does not move under the thumb', () => {
    const disabled = [{ ...segment('north', 0), availability: 'unavailable' as const }]

    expect(selectSegment(0, -1, disabled, 0.2).segmentId).toBe('north')
  })

  it('is total: every vector and preset yields a selection', () => {
    const presets: readonly (readonly WheelSegment[])[] = [[], compass, [segment('one', 0, 0)]]
    for (const preset of presets) {
      for (const [x, y] of [
        [0, 0],
        [0, -1],
        [1, 1],
        [-3, 2],
        [0.01, 0.01]
      ]) {
        const selection = selectSegment(x, y, preset, 0.2)
        expect(typeof selection.magnitude).toBe('number')
        expect(selection.segmentId === null || typeof selection.segmentId === 'string').toBe(true)
      }
    }
  })
})
