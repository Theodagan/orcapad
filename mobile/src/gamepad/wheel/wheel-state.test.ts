import { describe, expect, it } from 'vitest'
import {
  CLOSED_WHEEL,
  reduceWheel,
  stateAfter,
  type WheelEvent,
  type WheelPreset,
  type WheelState
} from './wheel-state'
import type { SegmentAvailability, WheelId, WheelSegment } from './wheel-segment'

const QUARTER = Math.PI / 2

function segment(
  id: string,
  centerAngle: number,
  availability: SegmentAvailability = 'available'
): WheelSegment {
  return {
    id,
    label: id,
    centerAngle,
    halfWidth: Math.PI / 6,
    availability,
    bindingId: `binding.${id}`
  }
}

const wheelOne = [segment('north', 0), segment('east', QUARTER)]
const wheelTwo = [segment('far-south', Math.PI)]

function preset(overrides: Partial<WheelPreset> = {}): WheelPreset {
  return {
    segmentsFor: (wheel: WheelId) => (wheel === 1 ? wheelOne : wheelTwo),
    deadZone: 0.2,
    ...overrides
  }
}

const UP: WheelEvent = { kind: 'motion', wheel: 1, x: 0, y: -1 }
const RIGHT: WheelEvent = { kind: 'motion', wheel: 1, x: 1, y: 0 }
const CENTRED: WheelEvent = { kind: 'motion', wheel: 1, x: 0, y: 0 }
const openOnNorth: WheelState = { kind: 'open', wheel: 1, locked: 'north' }

function reduce(state: WheelState, event: WheelEvent, p: WheelPreset = preset()) {
  return reduceWheel(state, event, p)
}

/** One named test per rule in WHEEL-R1, in the PRD's own order. */
describe('PRD wheel rules', () => {
  it('rule 1 — a wheel opens immediately when its stick leaves the dead zone', () => {
    expect(reduce(CLOSED_WHEEL, UP)).toEqual({
      kind: 'state',
      state: { kind: 'open', wheel: 1, locked: 'north' }
    })
  })

  it('rule 2 — it locks the segment indicated by the stick', () => {
    const opened = stateAfter(reduce(CLOSED_WHEEL, UP))

    expect(stateAfter(reduce(opened, RIGHT))).toEqual({
      kind: 'open',
      wheel: 1,
      locked: 'east'
    })
  })

  it('rule 3 — stick movement alone never executes an action', () => {
    const motions: WheelEvent[] = [
      UP,
      RIGHT,
      { kind: 'motion', wheel: 1, x: 0.7, y: -0.7 },
      { kind: 'motion', wheel: 2, x: 0, y: 1 }
    ]
    let state: WheelState = CLOSED_WHEEL
    const outcomes = motions.map((event) => {
      const outcome = reduce(state, event)
      state = stateAfter(outcome)
      return outcome
    })

    expect(outcomes.some((outcome) => outcome.kind === 'commit')).toBe(false)
  })

  it('rule 4 — A commits the currently locked segment', () => {
    expect(reduce(openOnNorth, { kind: 'confirm' })).toEqual({
      kind: 'commit',
      wheel: 1,
      segmentId: 'north'
    })
  })

  it('rule 5 — returning to centre or leaving a valid segment before A cancels', () => {
    expect(reduce(openOnNorth, CENTRED)).toEqual({ kind: 'cancel' })
    // A dead arc between north and east is "no longer on a valid segment".
    expect(reduce(openOnNorth, { kind: 'motion', wheel: 1, x: 0.7, y: -0.7 })).toEqual({
      kind: 'cancel'
    })
    expect(stateAfter({ kind: 'cancel' })).toEqual(CLOSED_WHEEL)
  })

  it('rule 6 — no hold-to-summon delay exists', () => {
    // The very first sample past the dead zone opens it; nothing counts samples or elapsed time.
    const first = reduce(CLOSED_WHEEL, { kind: 'motion', wheel: 1, x: 0, y: -0.21 })

    expect(stateAfter(first).kind).toBe('open')
  })
})

describe('the transition table', () => {
  it('opens either wheel from closed, by its own stick', () => {
    expect(stateAfter(reduce(CLOSED_WHEEL, { kind: 'motion', wheel: 2, x: 0, y: 1 }))).toEqual({
      kind: 'open',
      wheel: 2,
      locked: 'far-south'
    })
  })

  it('stays closed while the stick is inside the dead zone', () => {
    expect(reduce(CLOSED_WHEEL, { kind: 'motion', wheel: 1, x: 0.1, y: -0.1 })).toEqual({
      kind: 'state',
      state: CLOSED_WHEEL
    })
  })

  it('ignores the inactive stick entirely, so one wheel cannot steal the other', () => {
    expect(reduce(openOnNorth, { kind: 'motion', wheel: 2, x: 0, y: 1 })).toEqual({
      kind: 'state',
      state: openOnNorth
    })
  })

  it('cancels on B and on controller disconnect', () => {
    expect(reduce(openOnNorth, { kind: 'back' })).toEqual({ kind: 'cancel' })
    expect(reduce(openOnNorth, { kind: 'disconnect' })).toEqual({ kind: 'cancel' })
  })

  it('leaves A and B to the focused surface while the wheel is closed', () => {
    for (const event of [{ kind: 'confirm' }, { kind: 'back' }, { kind: 'disconnect' }] as const) {
      expect(reduce(CLOSED_WHEEL, event)).toEqual({ kind: 'state', state: CLOSED_WHEEL })
    }
  })
})

describe('failure behaviour (002 §6)', () => {
  it('opens an empty preset with no lock, and A cancels', () => {
    const empty = preset({ segmentsFor: () => [] })
    const opened = stateAfter(reduce(CLOSED_WHEEL, UP, empty))

    expect(opened).toEqual({ kind: 'open', wheel: 1, locked: null })
    expect(reduce(opened, { kind: 'confirm' }, empty)).toEqual({ kind: 'cancel' })
  })

  it('cancels A on an unavailable lock rather than delegating it', () => {
    const disabled = preset({ segmentsFor: () => [segment('north', 0, 'unavailable')] })

    expect(reduce(openOnNorth, { kind: 'confirm' }, disabled)).toEqual({ kind: 'cancel' })
  })

  it('commits an unknown lock, because unproven is not refused', () => {
    const unproven = preset({ segmentsFor: () => [segment('north', 0, 'unknown')] })

    expect(reduce(openOnNorth, { kind: 'confirm' }, unproven)).toEqual({
      kind: 'commit',
      wheel: 1,
      segmentId: 'north'
    })
  })

  it('cancels when the locked segment has unmounted since it was locked', () => {
    const unmounted = preset({ segmentsFor: () => [segment('east', QUARTER)] })

    expect(reduce(openOnNorth, { kind: 'confirm' }, unmounted)).toEqual({ kind: 'cancel' })
  })

  it('closes on every terminal outcome', () => {
    expect(stateAfter({ kind: 'commit', wheel: 1, segmentId: 'north' })).toEqual(CLOSED_WHEEL)
    expect(stateAfter({ kind: 'cancel' })).toEqual(CLOSED_WHEEL)
  })
})
