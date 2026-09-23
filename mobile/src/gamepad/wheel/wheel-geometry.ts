import type { WheelSegment, WheelSegmentId } from './wheel-segment'

/**
 * Vector to segment. Total by construction: every vector and every segment set yields a segment
 * id or null, so the state machine above never has to handle an "impossible" answer.
 *
 * Angles are measured from twelve o'clock, clockwise, because that is how the wheel is read on
 * screen. Screen Y grows downward, so "up" is a negative Y — the conversion happens here, once,
 * rather than in every preset.
 */

const TAU = Math.PI * 2

/** Wraps any angle into [0, 2π), so a segment spanning twelve o'clock needs no special case. */
export function normalizeAngle(angle: number): number {
  const wrapped = angle % TAU
  return wrapped < 0 ? wrapped + TAU : wrapped
}

/** Clockwise from twelve o'clock. Null for a vector with no direction at all. */
export function vectorAngle(x: number, y: number): number | null {
  if (x === 0 && y === 0) {
    return null
  }
  return normalizeAngle(Math.atan2(x, -y))
}

/** The smaller of the two ways round between two angles, always in [0, π]. */
export function angularDistance(a: number, b: number): number {
  const difference = normalizeAngle(a - b)
  return difference > Math.PI ? TAU - difference : difference
}

export type SegmentSelection = {
  /** Null when the vector is in the dead zone, in a dead arc, or there are no segments. */
  readonly segmentId: WheelSegmentId | null
  /** Null whenever the vector has no direction, which is not the same as pointing at nothing. */
  readonly angle: number | null
  readonly magnitude: number
}

/**
 * The segment the stick is indicating. A vector inside the dead zone selects nothing, which is
 * rule 5: returning to centre leaves no lock to commit.
 *
 * Overlapping segments resolve to the nearer centre rather than to declaration order, so a
 * preset cannot become order-dependent by accident. An unavailable segment can still be selected
 * — it renders disabled and `A` cancels on it (`002` §6) — because hiding it would move every
 * other segment under the user's thumb.
 */
export function selectSegment(
  x: number,
  y: number,
  segments: readonly WheelSegment[],
  deadZone: number
): SegmentSelection {
  const magnitude = Math.hypot(x, y)
  const angle = vectorAngle(x, y)
  if (angle === null || magnitude <= deadZone) {
    return { segmentId: null, angle, magnitude }
  }

  let nearest: WheelSegment | null = null
  let nearestDistance = Number.POSITIVE_INFINITY
  for (const segment of segments) {
    const distance = angularDistance(angle, normalizeAngle(segment.centerAngle))
    // A dead arc is simply the gap between segments: nothing claims that angle.
    if (distance > segment.halfWidth) {
      continue
    }
    if (distance < nearestDistance) {
      nearest = segment
      nearestDistance = distance
    }
  }
  return { segmentId: nearest === null ? null : nearest.id, angle, magnitude }
}
