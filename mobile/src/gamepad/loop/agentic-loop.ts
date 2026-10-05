import type { ControllerIntentKind } from '../controller-input/controller-intent'
import type { BoundSurface } from '../bindings/controller-binding-evidence'

/**
 * The cycle an agentic coding session actually is, as data.
 *
 * Written down because `003` finished with every task passing and the product goal unmet: a
 * controller-only user could see everything and prompt nothing. Each task there asked "is this
 * surface bound?", and every answer was yes. Nobody asked "can the loop turn?".
 *
 * So the unit here is a step of the loop rather than a surface, and the audit beside this asserts
 * each one against the real bindings. A step that stops being reachable fails a test instead of
 * being noticed on a device three weeks later.
 */

export type LoopStepId = 'observe' | 'prompt' | 'send' | 'interrupt' | 'answer' | 'approve' | 'read'

/**
 * How a step is carried: an intent the focused surface accepts, a wheel binding it offers, or the
 * session's dictation, which is the controller's one way to say something and is not an intent a
 * surface answers (it is step 2 of `001` §7, above every surface).
 */
export type LoopReach =
  | { readonly kind: 'intent'; readonly intent: ControllerIntentKind }
  | { readonly kind: 'wheel'; readonly bindingId: string }
  | { readonly kind: 'dictation' }

export type LoopStep = {
  readonly id: LoopStepId
  readonly surface: BoundSurface
  readonly what: string
  /** Any one of these carries the step; text has two paths on purpose (LOOP-R3). */
  readonly reachedBy: readonly LoopReach[]
}

export const AGENTIC_LOOP: readonly LoopStep[] = [
  {
    id: 'observe',
    surface: 'workspaces',
    what: 'find the workspace to work in',
    reachedBy: [
      { kind: 'intent', intent: 'cycle-workspace' },
      { kind: 'intent', intent: 'move-selection' }
    ]
  },
  {
    id: 'prompt',
    surface: 'agent',
    what: 'get a prompt to the agent',
    // The only path. `004` added canned replies for when dictation is unavailable, and the device
    // feedback that opened `005` revoked them from the wheel, so this step now stands on one leg.
    reachedBy: [{ kind: 'dictation' }]
  },
  {
    id: 'send',
    surface: 'agent',
    what: 'send what was dictated, which lands in the composer or the terminal input',
    reachedBy: [{ kind: 'intent', intent: 'confirm' }]
  },
  {
    id: 'interrupt',
    surface: 'agent',
    what: 'stop a turn that is going wrong',
    // Off `X` since `005`: the zone switch took it, and stopping lives on the right wheel.
    reachedBy: [{ kind: 'wheel', bindingId: 'agent.stop' }]
  },
  {
    id: 'answer',
    surface: 'agent',
    what: 'answer a question from the agent',
    reachedBy: [
      { kind: 'intent', intent: 'move-selection' },
      { kind: 'intent', intent: 'confirm' }
    ]
  },
  {
    id: 'approve',
    surface: 'agent',
    what: 'approve or refuse a tool call',
    reachedBy: [
      { kind: 'intent', intent: 'confirm' },
      { kind: 'intent', intent: 'back' }
    ]
  },
  {
    id: 'read',
    surface: 'files',
    what: 'read what the agent changed',
    reachedBy: [
      { kind: 'intent', intent: 'scroll' },
      { kind: 'intent', intent: 'confirm' }
    ]
  }
]

/** What a mounted surface offers, as the audit needs to see it. */
export type SurfaceCapability = {
  readonly accepts: ReadonlySet<ControllerIntentKind>
  readonly wheelBindingIds: ReadonlySet<string>
  /** Whether the session's dictation is registered and could start from here. */
  readonly canDictate: boolean
}

function carried(reach: LoopReach, capability: SurfaceCapability): boolean {
  if (reach.kind === 'intent') {
    return capability.accepts.has(reach.intent)
  }
  return reach.kind === 'wheel'
    ? capability.wheelBindingIds.has(reach.bindingId)
    : capability.canDictate
}

/**
 * Which steps nothing can carry. Named rather than counted: "four of six reachable" is the kind
 * of summary that let this gap survive a whole specification.
 */
export function unreachableSteps(
  capabilities: ReadonlyMap<LoopStepId, SurfaceCapability>
): readonly string[] {
  return AGENTIC_LOOP.filter((step) => {
    const capability = capabilities.get(step.id)
    if (capability === undefined) {
      return true
    }
    // Any one path is enough; `reachedBy` lists alternatives, not requirements.
    return !step.reachedBy.some((reach) => carried(reach, capability))
  }).map((step) => `${step.id} (${step.what}) on ${step.surface}`)
}
