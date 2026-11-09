import { angularDistance, SELECT_RADIUS, steerLock, vectorAngle } from './wheel-geometry'
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

/** Sticks that have acted, or were held out while another wheel owned the pad, and not yet centred. */
export type SpentSticks = ReadonlySet<WheelId>

/** A descent leaves the stick on whatever chose the menu; it must let go before the menu locks. */
export type HeldStick = {
  /** Where the stick sat when the menu's choices could first be pointed at. Null until then. */
  readonly anchor: number | null
}

export type WheelState =
  /**
   * Without `spent` a held stick would reopen the wheel the instant it closed, and `L2` could
   * never close anything.
   */
  | { readonly kind: 'closed'; readonly spent: SpentSticks }
  | {
      readonly kind: 'open'
      readonly wheel: WheelId
      /** The menus descended into, outermost first. Empty is the wheel's own preset. */
      readonly path: readonly string[]
      readonly locked: WheelSegmentId | null
      /** The other stick, held out while this wheel owns the pad, stays spent when it closes. */
      readonly spent: SpentSticks
      readonly held?: HeldStick
    }

const NONE_SPENT: SpentSticks = new Set()

export const CLOSED_WHEEL: WheelState = { kind: 'closed', spent: NONE_SPENT }

/** Below this swing from the anchor the stick still counts as the one that chose the menu. */
export const RELEASE_SWING = 0.3

export type WheelEvent =
  | { readonly kind: 'motion'; readonly wheel: WheelId; readonly x: number; readonly y: number }
  /** `R2` while a wheel is open (decision 007). */
  | { readonly kind: 'confirm' }
  /** `L2` while a wheel is open (decision 007). */
  | { readonly kind: 'back' }
  | { readonly kind: 'disconnect' }

export type WheelOutcome =
  | { readonly kind: 'state'; readonly state: WheelState }
  | {
      readonly kind: 'commit'
      readonly wheel: WheelId
      readonly segmentId: WheelSegmentId
      readonly spent: SpentSticks
    }
  /** The locked segment opens another wheel. Nothing runs. */
  | {
      readonly kind: 'descend'
      readonly wheel: WheelId
      readonly path: readonly string[]
      readonly spent: SpentSticks
    }
  /** `L2` inside a menu: one level back, not out. */
  | {
      readonly kind: 'ascend'
      readonly wheel: WheelId
      readonly path: readonly string[]
      readonly spent: SpentSticks
    }
  | { readonly kind: 'cancel'; readonly spent: SpentSticks }

export type WheelPreset = {
  readonly segmentsFor: (wheel: WheelId, path: readonly string[]) => readonly WheelSegment[]
  readonly deadZone: number
  /** True while the menu at the end of `path` is still being fetched. Absent: nothing loads. */
  readonly isLoading?: (wheel: WheelId, path: readonly string[]) => boolean
}

/** Every way out of an open wheel closes it; descending and ascending keep it open. */
export function stateAfter(outcome: WheelOutcome): WheelState {
  switch (outcome.kind) {
    case 'state':
      return outcome.state
    case 'commit':
    case 'cancel':
      return { kind: 'closed', spent: outcome.spent }
    case 'descend':
      return {
        kind: 'open',
        wheel: outcome.wheel,
        path: outcome.path,
        locked: null,
        spent: outcome.spent,
        held: { anchor: null }
      }
    case 'ascend':
      return {
        kind: 'open',
        wheel: outcome.wheel,
        path: outcome.path,
        locked: null,
        spent: outcome.spent
      }
  }
}

function keeping(state: WheelState): WheelOutcome {
  return { kind: 'state', state }
}

/** Returns `spent` itself when nothing changes, so an unchanged state stays the same object. */
function spentWith(spent: SpentSticks, wheel: WheelId, isSpent: boolean): SpentSticks {
  if (spent.has(wheel) === isSpent) {
    return spent
  }
  const next = new Set(spent)
  if (isSpent) {
    next.add(wheel)
  } else {
    next.delete(wheel)
  }
  return next
}

function onMotion(
  state: WheelState,
  event: Extract<WheelEvent, { kind: 'motion' }>,
  preset: WheelPreset
): WheelOutcome {
  const magnitude = Math.hypot(event.x, event.y)
  const centred = magnitude <= preset.deadZone

  if (state.kind === 'closed') {
    if (state.spent.has(event.wheel)) {
      // Spent: nothing opens until this stick has come back to centre.
      const spent = spentWith(state.spent, event.wheel, !centred)
      return keeping(spent === state.spent ? state : { kind: 'closed', spent })
    }
    // Rule 1 and rule 6 together: the first sample outside the dead zone opens it. There is no
    // counter and no timer to consult, so a summon delay cannot be introduced by accident.
    if (centred) {
      return keeping(state)
    }
    // An empty preset, a dead arc or a stick short of SELECT_RADIUS opens with no lock (§6).
    const locked = steerLock(event.x, event.y, preset.segmentsFor(event.wheel, []), null)
    return keeping({ kind: 'open', wheel: event.wheel, path: [], locked, spent: state.spent })
  }

  // Both wheels exist, but only the one that opened is listening (WHEEL-R4).
  if (event.wheel !== state.wheel) {
    const spent = spentWith(state.spent, event.wheel, !centred)
    return keeping(spent === state.spent ? state : { ...state, spent })
  }
  // Rule 5: centring cancels rather than keeping a stale lock. The stick is back at centre, so
  // there is nothing to wait for before reopening.
  if (centred) {
    return { kind: 'cancel', spent: state.spent }
  }
  const angle = vectorAngle(event.x, event.y)
  if (state.held !== undefined && angle !== null && magnitude >= SELECT_RADIUS) {
    if (state.held.anchor === null) {
      return keeping({ ...state, held: { anchor: angle } })
    }
    if (angularDistance(angle, state.held.anchor) < RELEASE_SWING) {
      return keeping(state)
    }
  }
  // A gap holds the wheel open with nothing lit: per-screen layouts leave empty slots.
  const locked = steerLock(
    event.x,
    event.y,
    preset.segmentsFor(state.wheel, state.path),
    state.locked
  )
  if (locked === state.locked && state.held === undefined) {
    return keeping(state)
  }
  return keeping({
    kind: 'open',
    wheel: state.wheel,
    path: state.path,
    locked,
    spent: state.spent
  })
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
    // A closed wheel consumes nothing: the triggers belong to the focused surface (`001` §7).
    return keeping(state)
  }
  if (event.kind === 'disconnect') {
    return { kind: 'cancel', spent: NONE_SPENT }
  }
  const spentHere = spentWith(state.spent, state.wheel, true)
  if (event.kind === 'back') {
    // Inside a menu `L2` steps back one level; at the wheel's own level it closes it.
    return state.path.length > 0
      ? { kind: 'ascend', wheel: state.wheel, path: state.path.slice(0, -1), spent: state.spent }
      : { kind: 'cancel', spent: spentHere }
  }
  // Choices that have not arrived yet are not a refusal: `R2` waits for them.
  if (state.path.length > 0 && preset.isLoading?.(state.wheel, state.path) === true) {
    return keeping(state)
  }
  if (state.locked === null) {
    return { kind: 'cancel', spent: spentHere }
  }
  const lockedId = state.locked
  const locked =
    preset.segmentsFor(state.wheel, state.path).find((segment) => segment.id === lockedId) ?? null
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
          path: [...state.path, locked.bindingId],
          spent: state.spent
        }
      : { kind: 'commit', wheel: state.wheel, segmentId: lockedId, spent: spentHere }
  }
  return { kind: 'cancel', spent: spentHere }
}
