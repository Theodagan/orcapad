import type { SurfaceBinding } from './surface-binding'
import { focusTargetFor, type IntentHandlerEntry } from './surface-binding'

/**
 * Controller edges for the existing pairing screens. Both of them are a confirm and a back over
 * actions the route already owns, so they share one builder (`003` §2: invoke existing route
 * actions; do not parse or pair again).
 *
 * Nothing about pairing is decided here. The screen passes the callbacks it is currently
 * rendering, which is what keeps BIND-AC3 true by construction: the controller reaches the same
 * function the button's `onPress` does, because it is the same function.
 */
export type PairingRouteActions = {
  /**
   * Null whenever the screen is showing nothing to confirm — mid-connect, for instance. An
   * absent action is not accepted rather than accepted and ignored, so the intent stays a no-op
   * that something else could still answer (`001` §7 step 4).
   */
  readonly confirm: (() => void) | null
  readonly back: (() => void) | null
}

export function pairingRouteBinding(id: string, actions: PairingRouteActions): SurfaceBinding {
  const entries: IntentHandlerEntry[] = []
  if (actions.confirm !== null) {
    entries.push(['confirm', actions.confirm])
  }
  if (actions.back !== null) {
    entries.push(['back', actions.back])
  }
  // No wheel actions: pairing is a two-button screen, and a wheel over it would name the same
  // two actions the face buttons already reach.
  return { focusTarget: focusTargetFor(id, entries), wheelActions: [] }
}
