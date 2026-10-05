import { selectSegment } from './wheel-geometry'
import type { WheelId, WheelSegment, WheelSegmentId } from './wheel-segment'

/**
 * The wheel's whole behaviour, as a pure function of state and event.
 *
 * Pure on purpose, and this is the point of the feature rather than a style choice: PRD rule 3
 * says stick movement alone never executes an action, and the only way to prove that is for the
 * mechanics to have no way to execute anything. A commit outcome is a value the dispatcher
 * decides to act on; nothing here can invoke a binding even by mistake (WHEEL-R2).
 *
 * A wheel can open another (`005` USE-R10). That is a descent, not a commit: it runs nothing, and
 * it changes which segments the stick is choosing between. What those segments are is not this
 * file's business, so a menu is only an opaque key on a path.
 */

export type WheelState =
  /**
   * `spent` is the wheel whose stick has acted (committed, or been cancelled with B) and has not
   * come back to centre yet. Without it a held stick would reopen the wheel the instant it
   * closed, and B could never close anything.
   */
  | { readonly kind: 'closed'; readonly spent: WheelId | null }
  | {
      readonly kind: 'open'
      readonly wheel: WheelId
      /** The menus descended into, outermost first. Empty is the wheel's own preset. */
      readonly path: readonly string[]
      readonly locked: WheelSegmentId | null
    }

export const CLOSED_WHEEL: WheelState = { kind: 'closed', spent: null }

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
  /** The locked segment opens another wheel. Nothing runs. */
  | {
      readonly kind: 'descend'
      readonly wheel: WheelId
      readonly path: readonly string[]
    }
  /** `B` inside a menu: one level back, not out. */
  | {
      readonly kind: 'ascend'
      readonly wheel: WheelId
      readonly path: readonly string[]
    }
  | { readonly kind: 'cancel'; readonly spent: WheelId | null }

export type WheelPreset = {
  readonly segmentsFor: (wheel: WheelId, path: readonly string[]) => readonly WheelSegment[]
  readonly deadZone: number
}

/** Every way out of an open wheel closes it; descending and ascending keep it open. */
export function stateAfter(outcome: WheelOutcome): WheelState {
  switch (outcome.kind) {
    case 'state':
      return outcome.state
    case 'commit':
      return { kind: 'closed', spent: outcome.wheel }
    case 'cancel':
      return { kind: 'closed', spent: outcome.spent }
    case 'descend':
    case 'ascend':
      return { kind: 'open', wheel: outcome.wheel, path: outcome.path, locked: null }
  }
}

function keeping(state: WheelState): WheelOutcome {
  return { kind: 'state', state }
}

function segmentOf(
  preset: WheelPreset,
  wheel: WheelId,
  path: readonly string[],
  segmentId: WheelSegmentId
): WheelSegment | null {
  return preset.segmentsFor(wheel, path).find((segment) => segment.id === segmentId) ?? null
}

function onMotion(
  state: WheelState,
  event: Extract<WheelEvent, { kind: 'motion' }>,
  preset: WheelPreset
): WheelOutcome {
  const path = state.kind === 'open' ? state.path : []
  const { segmentId, magnitude } = selectSegment(
    event.x,
    event.y,
    preset.segmentsFor(event.wheel, path),
    preset.deadZone
  )

  if (state.kind === 'closed') {
    if (state.spent === event.wheel) {
      // Spent: nothing opens until this stick has come back to centre.
      return keeping(magnitude <= preset.deadZone ? CLOSED_WHEEL : state)
    }
    // Rule 1 and rule 6 together: the first sample outside the dead zone opens it. There is no
    // counter and no timer to consult, so a summon delay cannot be introduced by accident.
    if (magnitude <= preset.deadZone) {
      return keeping(state)
    }
    // An empty preset, or a dead arc, opens with no lock rather than refusing to open (§6).
    return keeping({ kind: 'open', wheel: event.wheel, path: [], locked: segmentId })
  }

  // Both wheels exist, but only the one that opened is listening (WHEEL-R4).
  if (event.wheel !== state.wheel) {
    return keeping(state)
  }
  if (segmentId === null) {
    // A menu still loading, or empty, has nothing to point at: only centring cancels it, or a
    // jiggling thumb would close it before its choices arrive.
    if (magnitude > preset.deadZone && preset.segmentsFor(state.wheel, state.path).length === 0) {
      return keeping({ ...state, locked: null })
    }
    // Rule 5: centring, or drifting into a dead arc, cancels rather than keeping a stale lock.
    // The stick is back at centre (or in a gap), so there is nothing to wait for before reopening.
    return { kind: 'cancel', spent: null }
  }
  return keeping({ kind: 'open', wheel: state.wheel, path: state.path, locked: segmentId })
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
  if (event.kind === 'disconnect') {
    return { kind: 'cancel', spent: null }
  }
  if (event.kind === 'back') {
    // Inside a menu `B` steps back one level; at the wheel's own level it closes it.
    return state.path.length > 0
      ? { kind: 'ascend', wheel: state.wheel, path: state.path.slice(0, -1) }
      : { kind: 'cancel', spent: state.wheel }
  }
  if (state.locked === null) {
    return { kind: 'cancel', spent: state.wheel }
  }
  const locked = segmentOf(preset, state.wheel, state.path, state.locked)
  // `unknown` commits: an affordance we have not proved is still offered, and the surface it
  // delegates to reports the real result. `unavailable` is a refusal, so it cancels.
  // A lock whose segment has since unmounted resolves to null here and cancels too (§6).
  if (
    locked !== null &&
    (locked.availability === 'available' || locked.availability === 'unknown')
  ) {
    return locked.opens === true
      ? {
          kind: 'descend',
          wheel: state.wheel,
          path: [...state.path, locked.bindingId]
        }
      : { kind: 'commit', wheel: state.wheel, segmentId: state.locked }
  }
  return { kind: 'cancel', spent: state.wheel }
}
