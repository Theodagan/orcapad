/**
 * What `A` and `B` mean while an agent is asking something.
 *
 * `003` §5 orders it: `A` accepts the currently selected or default answer through the existing
 * callback, `B` rejects or dismisses through the existing callback. The hard part is that two of
 * the three intervention kinds have no default to accept, and this is where that is decided —
 * pure, so the decision is testable without a chat.
 *
 * Precedence mirrors `MobileNativeChatPromptCard` exactly: an AskUserQuestion prompt wins, then a
 * heuristic permission, then a heuristic question. Only one card is ever mounted, so the
 * controller must agree with the one the user can see (BIND-AC3).
 */

export type PromptIdentity = { readonly itemId: string; readonly expectedRevision: number }

/** Structural on purpose: the binding answers for these shapes without importing the chat. */
export type InterventionSurface = {
  readonly ask?: { readonly questions: readonly unknown[] } | null
  readonly permission?: {
    readonly options: readonly { readonly send: string }[]
    readonly prompt?: PromptIdentity
  } | null
  readonly question?: { readonly prompt?: PromptIdentity } | null
  /** Returns are ignored: the chat's own callbacks answer with a promise, and a binding only
   *  has to invoke them, never to wait on one. */
  readonly onRespondPermission?: (send: string) => unknown
  readonly onCancelAsk?: () => unknown
  readonly onCancelPrompt?: (prompt?: PromptIdentity) => unknown
}

export type AgentIntervention = {
  readonly kind: 'ask' | 'permission' | 'question'
  /** Null when accepting would mean guessing; `A` is then a no-op (`001` §7 step 4). */
  readonly accept: (() => void) | null
  readonly reject: (() => void) | null
}

export function resolveAgentIntervention(surface: InterventionSurface): AgentIntervention | null {
  const { ask, permission, question } = surface

  if (ask !== null && ask !== undefined) {
    return {
      kind: 'ask',
      // No accept. The ask card starts with nothing selected and requires a selection before it
      // will submit, so there is no "currently selected" answer to take — and its options are
      // peers, not a ranked list with an obvious first. Picking one for the user could answer
      // "Delete everything?" with the first thing on the list.
      accept: null,
      reject: surface.onCancelAsk === undefined ? null : () => void surface.onCancelAsk?.()
    }
  }

  if (permission !== null && permission !== undefined) {
    const affirmative = permission.options[0]
    const respond = surface.onRespondPermission
    return {
      kind: 'permission',
      // The one intervention with a real default: the card renders the affirmative first, and
      // "allow" is exactly what a confirm button means.
      accept:
        affirmative === undefined || respond === undefined ? null : () => respond(affirmative.send),
      reject: dismissal(surface, permission.prompt)
    }
  }

  if (question !== null && question !== undefined) {
    return {
      kind: 'question',
      // Same refusal as the ask: a list of options is not a ranked list, and nothing here knows
      // which one the user meant.
      accept: null,
      reject: dismissal(surface, question.prompt)
    }
  }

  return null
}

/** The card's own dismiss button, which is what `B` should be reaching. */
function dismissal(surface: InterventionSurface, prompt?: PromptIdentity): (() => void) | null {
  const cancel = surface.onCancelPrompt
  return cancel === undefined ? null : () => void cancel(prompt)
}
