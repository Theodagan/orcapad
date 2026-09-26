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

export type LoopStepId = 'observe' | 'prompt' | 'interrupt' | 'answer' | 'approve' | 'read'

/** How a step is carried: an intent the focused surface accepts, or a wheel binding it offers. */
export type LoopReach =
  | { readonly kind: 'intent'; readonly intent: ControllerIntentKind }
  | { readonly kind: 'wheel'; readonly bindingId: string }

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
    reachedBy: [
      // Dictation is the primary path; a canned reply is what works when it is unavailable.
      { kind: 'intent', intent: 'toggle-dictation' },
      { kind: 'wheel', bindingId: 'agent.reply.continue' }
    ]
  },
  {
    id: 'interrupt',
    surface: 'agent',
    what: 'stop a turn that is going wrong',
    reachedBy: [{ kind: 'intent', intent: 'stop' }]
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
}

function carried(reach: LoopReach, capability: SurfaceCapability): boolean {
  return reach.kind === 'intent'
    ? capability.accepts.has(reach.intent)
    : capability.wheelBindingIds.has(reach.bindingId)
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
