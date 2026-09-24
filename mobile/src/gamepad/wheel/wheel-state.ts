import { selectSegment } from './wheel-geometry'
import type { WheelId, WheelSegment, WheelSegmentId } from './wheel-segment'

/**
 * The wheel's whole behaviour, as a pure function of state and event.
 *
 * Pure on purpose, and this is the point of the feature rather than a style choice: PRD rule 3
 * says stick movement alone never executes an action, and the only way to prove that is for the
 * mechanics to have no way to execute anything. A commit outcome is a value the dispatcher
 * decides to act on; nothing here can invoke a binding even by mistake (WHEEL-R2).
 */

export type WheelState =
  | { readonly kind: 'closed' }
  | { readonly kind: 'open'; readonly wheel: WheelId; readonly locked: WheelSegmentId | null }

export const CLOSED_WHEEL: WheelState = { kind: 'closed' }

export type WheelEvent =
  | { readonly kind: 'motion'; readonly wheel: WheelId; readonly x: number; readonly y: number }
  /** `A`. */
  | { readonly kind: 'confirm' }
  /** `B`. */
  | { readonly kind: 'back' }
  | { readonly kind: 'disconnect' }

export type WheelOutcome =
  | { readonly kind: 'state'; readonly state: WheelState }
  | {
      readonly kind: 'commit'
      readonly wheel: WheelId
      readonly segmentId: WheelSegmentId
    }
  | { readonly kind: 'cancel' }

export type WheelPreset = {
  readonly segmentsFor: (wheel: WheelId) => readonly WheelSegment[]
  readonly deadZone: number
}

/** Commit and cancel both close. Stated once, so no caller has to remember it. */
export function stateAfter(outcome: WheelOutcome): WheelState {
  return outcome.kind === 'state' ? outcome.state : CLOSED_WHEEL
}

function keeping(state: WheelState): WheelOutcome {
  return { kind: 'state', state }
}

function availabilityOf(
  preset: WheelPreset,
  wheel: WheelId,
  segmentId: WheelSegmentId
): WheelSegment['availability'] | null {
  return preset.segmentsFor(wheel).find((segment) => segment.id === segmentId)?.availability ?? null
}

function onMotion(
  state: WheelState,
  event: Extract<WheelEvent, { kind: 'motion' }>,
  preset: WheelPreset
): WheelOutcome {
  const { segmentId, magnitude } = selectSegment(
    event.x,
    event.y,
    preset.segmentsFor(event.wheel),
    preset.deadZone
  )

  if (state.kind === 'closed') {
    // Rule 1 and rule 6 together: the first sample outside the dead zone opens it. There is no
    // counter and no timer to consult, so a summon delay cannot be introduced by accident.
    if (magnitude <= preset.deadZone) {
      return keeping(state)
    }
    // An empty preset, or a dead arc, opens with no lock rather than refusing to open (§6).
    return keeping({ kind: 'open', wheel: event.wheel, locked: segmentId })
  }

  // Both wheels exist, but only the one that opened is listening (WHEEL-R4).
  if (event.wheel !== state.wheel) {
    return keeping(state)
  }
  // Rule 5: centring, or drifting into a dead arc, cancels rather than keeping a stale lock.
  if (segmentId === null) {
    return { kind: 'cancel' }
  }
  return keeping({ kind: 'open', wheel: state.wheel, locked: segmentId })
}

export function reduceWheel(
  state: WheelState,
  event: WheelEvent,
  preset: WheelPreset
): WheelOutcome {
  if (event.kind === 'motion') {
    return onMotion(state, event, preset)
  }
  if (state.kind === 'closed') {
    // A closed wheel consumes nothing: `A` and `B` belong to the focused surface (`001` §7).
    return keeping(state)
  }
  if (event.kind === 'back' || event.kind === 'disconnect') {
    return { kind: 'cancel' }
  }
  if (state.locked === null) {
    return { kind: 'cancel' }
  }
  const availability = availabilityOf(preset, state.wheel, state.locked)
  // `unknown` commits: an affordance we have not proved is still offered, and the surface it
  // delegates to reports the real result. `unavailable` is a refusal, so it cancels.
  // A lock whose segment has since unmounted resolves to null here and cancels too (§6).
  if (availability === 'available' || availability === 'unknown') {
    return { kind: 'commit', wheel: state.wheel, segmentId: state.locked }
  }
  return { kind: 'cancel' }
}
