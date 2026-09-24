import type { WheelOutcome } from './wheel-state'
import type { WheelSegment } from './wheel-segment'

/**
 * The one place a wheel outcome becomes an action. `002` §2: only the dispatcher handling
 * `commit` resolves a `bindingId` and invokes anything — which is why the state machine can be
 * trusted not to, and why this file is small enough to read in one go.
 *
 * It takes segments and a runner rather than a registry so that WHEEL-T4 can grow the registry
 * without this ever learning what an action is.
 */

export type WheelActionRunner = (bindingId: string) => void

/**
 * Invokes at most once, and only for a commit. A segment that has gone since the lock was taken
 * resolves to nothing and is skipped, rather than invoking a binding id that no longer has an
 * owner (§6).
 *
 * An action that throws is left to throw: `002` §6 gives error reporting to the surface that
 * owns the action, and the wheel is already closed by the time this runs, so nothing here can
 * reopen it.
 */
export function dispatchWheelOutcome(
  outcome: WheelOutcome,
  segments: readonly WheelSegment[],
  run: WheelActionRunner
): void {
  if (outcome.kind !== 'commit') {
    return
  }
  const committed = segments.find((segment) => segment.id === outcome.segmentId)
  if (committed === undefined) {
    return
  }
  run(committed.bindingId)
}
