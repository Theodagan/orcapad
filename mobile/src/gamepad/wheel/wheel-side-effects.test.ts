import { describe, expect, it, vi } from 'vitest'
import { dispatchWheelOutcome } from './wheel-dispatcher'
import {
  CLOSED_WHEEL,
  reduceWheel,
  stateAfter,
  type WheelEvent,
  type WheelPreset,
  type WheelState
} from './wheel-state'
import type { SegmentAvailability, WheelId, WheelSegment } from './wheel-segment'

/**
 * WHEEL-T3. The state machine cannot invoke anything by construction, so the risk is the seam:
 * the dispatcher runs on every outcome and has to act on exactly one kind. This drives the whole
 * vocabulary of paths against recording actions and asserts nothing fired but a commit.
 *
 * The recorder is the point. Asserting "no action ran" against a stub that could never run one
 * proves nothing, so every segment here has a real recorded binding that a bug would reach.
 */

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

/** Drives a sequence and records every binding the dispatcher chose to run. */
function drive(
  events: readonly WheelEvent[],
  p: WheelPreset = preset(),
  from: WheelState = CLOSED_WHEEL
): { invoked: string[]; state: WheelState } {
  const invoked: string[] = []
  let state = from
  for (const event of events) {
    const outcome = reduceWheel(state, event, p)
    state = stateAfter(outcome)
    dispatchWheelOutcome(
      outcome,
      p.segmentsFor(event.kind === 'motion' ? event.wheel : 1),
      (id) => {
        invoked.push(id)
      }
    )
  }
  return { invoked, state }
}

const up: WheelEvent = { kind: 'motion', wheel: 1, x: 0, y: -1 }
const right: WheelEvent = { kind: 'motion', wheel: 1, x: 1, y: 0 }
const deadArc: WheelEvent = { kind: 'motion', wheel: 1, x: 0.7, y: -0.7 }
const centred: WheelEvent = { kind: 'motion', wheel: 1, x: 0, y: 0 }
const confirm: WheelEvent = { kind: 'confirm' }

describe('only a commit can produce an invocation', () => {
  it('opening runs nothing', () => {
    expect(drive([up]).invoked).toEqual([])
  })

  it('moving between segments runs nothing, however far it travels', () => {
    expect(drive([up, right, up, right, up]).invoked).toEqual([])
  })

  it('an invalid direction runs nothing and closes', () => {
    const { invoked, state } = drive([up, deadArc])

    expect(invoked).toEqual([])
    expect(state).toEqual(CLOSED_WHEEL)
  })

  it('returning to centre runs nothing and closes', () => {
    const { invoked, state } = drive([up, centred])

    expect(invoked).toEqual([])
    expect(state).toEqual(CLOSED_WHEEL)
  })

  it('B runs nothing and closes', () => {
    const { invoked, state } = drive([up, { kind: 'back' }])

    expect(invoked).toEqual([])
    expect(state).toEqual(CLOSED_WHEEL)
  })

  it('a controller disconnect runs nothing and closes', () => {
    const { invoked, state } = drive([up, { kind: 'disconnect' }])

    expect(invoked).toEqual([])
    expect(state).toEqual(CLOSED_WHEEL)
  })

  it('A on an unavailable lock runs nothing', () => {
    const disabled = preset({ segmentsFor: () => [segment('north', 0, 'unavailable')] })

    expect(drive([up, confirm], disabled).invoked).toEqual([])
  })

  it('A on a segment that unmounted while locked runs nothing', () => {
    // Opens on north, then the preset no longer offers it — the lock has no owner left.
    let segments: readonly WheelSegment[] = wheelOne
    const unmounting = preset({ segmentsFor: () => segments })
    const invoked: string[] = []
    let state: WheelState = CLOSED_WHEEL

    for (const event of [up, confirm]) {
      if (event === confirm) {
        segments = [segment('east', QUARTER)]
      }
      const outcome = reduceWheel(state, event, unmounting)
      state = stateAfter(outcome)
      dispatchWheelOutcome(outcome, segments, (id) => invoked.push(id))
    }

    expect(invoked).toEqual([])
    expect(state).toEqual(CLOSED_WHEEL)
  })

  it('A on an empty preset runs nothing', () => {
    expect(drive([up, confirm], preset({ segmentsFor: () => [] })).invoked).toEqual([])
  })

  it('the inactive stick runs nothing', () => {
    expect(drive([up, { kind: 'motion', wheel: 2, x: 0, y: 1 }]).invoked).toEqual([])
  })

  it('A and B with no wheel open run nothing', () => {
    expect(drive([confirm, { kind: 'back' }, { kind: 'disconnect' }]).invoked).toEqual([])
  })

  it('a committed segment runs its binding exactly once', () => {
    const { invoked, state } = drive([up, confirm])

    expect(invoked).toEqual(['binding.north'])
    expect(state).toEqual(CLOSED_WHEEL)
  })

  it('commits an unknown availability, which is offered rather than refused', () => {
    const unproven = preset({ segmentsFor: () => [segment('north', 0, 'unknown')] })

    expect(drive([up, confirm], unproven).invoked).toEqual(['binding.north'])
  })

  it('invokes once per commit, and each gesture commits its own segment', () => {
    // north committed and closed, then a fresh gesture that ends on east.
    expect(drive([up, confirm, up, right, confirm]).invoked).toEqual([
      'binding.north',
      'binding.east'
    ])
  })

  it('does not invoke again for samples that arrive after a commit closed the wheel', () => {
    expect(drive([up, confirm, right, up, centred]).invoked).toEqual(['binding.north'])
  })
})

describe('an action that throws', () => {
  it('leaves the wheel closed, because it was closed before the action ran', () => {
    const outcome = reduceWheel({ kind: 'open', wheel: 1, locked: 'north' }, confirm, preset())
    const state = stateAfter(outcome)
    const exploding = vi.fn(() => {
      throw new Error('the surface will report this')
    })

    expect(() => dispatchWheelOutcome(outcome, wheelOne, exploding)).toThrow(
      'the surface will report this'
    )
    // §6: error reporting belongs to the surface that owns the action; the wheel is already shut.
    expect(state).toEqual(CLOSED_WHEEL)
    expect(exploding).toHaveBeenCalledTimes(1)
  })
})
