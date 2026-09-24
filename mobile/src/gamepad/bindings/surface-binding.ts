import type { ControllerIntent, ControllerIntentKind } from '../controller-input/controller-intent'
import type { DictationTextTarget, FocusTarget } from '../focus/focus-target'
import type { WheelActionBinding } from '../wheel/wheel-registry'

/**
 * What an existing surface contributes to the controller layer (`003` §1): where its intents go,
 * and which of its actions a wheel preset may name. Both are references into a surface that
 * already owns its state — a binding adds no state of its own beyond selection (BIND-R1).
 *
 * Registrations last exactly as long as the surface is mounted, so a screen that has gone cannot
 * receive an intent or answer for a wheel segment (`003` §10).
 */
export type SurfaceBinding = {
  readonly focusTarget: FocusTarget
  /** BIND-R10: stable ids a preset may name. Position and wheel side are never decided here. */
  readonly wheelActions: readonly WheelActionBinding[]
}

/**
 * One entry per intent the surface answers for. A tuple list rather than an object because
 * `Object.keys` widens to `string`: built this way, `accepts` below is derived from the same
 * structure the handlers live in, with no cast and no second list to keep in step.
 *
 * Each handler takes the whole intent and narrows what it needs; only `scroll` and the
 * provisional selection intents carry a payload worth narrowing for.
 */
export type IntentHandlerEntry = readonly [ControllerIntentKind, (intent: ControllerIntent) => void]

/**
 * Declaring `accepts` and the handlers separately is the obvious way to write this and the
 * obvious way to get it wrong: a handler nothing accepts is silently dead, and a kind accepted
 * with no handler swallows the intent from anything else that might have wanted it.
 */
export function focusTargetFor(
  id: string,
  entries: readonly IntentHandlerEntry[],
  textTarget?: DictationTextTarget
): FocusTarget {
  const handlers = new Map(entries)
  return {
    id,
    accepts: new Set(handlers.keys()),
    handle: (intent) => handlers.get(intent.kind)?.(intent),
    ...(textTarget === undefined ? {} : { textTarget })
  }
}
