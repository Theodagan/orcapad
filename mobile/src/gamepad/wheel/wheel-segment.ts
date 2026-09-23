/**
 * What a wheel is made of. Ids, positions, labels and availability — and deliberately nothing
 * about what committing one does (WHEEL-R3). The geometry can select a segment on a wheel whose
 * actions it has never heard of, which is what lets presets be rearranged without touching this.
 */

export type WheelId = 1 | 2

export type WheelSegmentId = string

/** Matches a port's three states: an unproven affordance is offered, a refused one is not. */
export const SEGMENT_AVAILABILITIES = ['available', 'unavailable', 'unknown'] as const

export type SegmentAvailability = (typeof SEGMENT_AVAILABILITIES)[number]

export type WheelSegment = {
  readonly id: WheelSegmentId
  readonly label: string
  /** Radians, 0 at twelve o'clock, increasing clockwise. Preset data, not feature code. */
  readonly centerAngle: number
  /** Radians either side of the centre. Two segments may overlap; the nearer centre wins. */
  readonly halfWidth: number
  readonly availability: SegmentAvailability
  /** Resolved by the dispatcher on commit, never by the geometry. */
  readonly bindingId: string
}
