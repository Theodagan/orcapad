import type { WheelActionBinding } from '../wheel-registry'

/**
 * A handful of replies the user can commit from the wheel, for when dictation is not there.
 *
 * `R3` is the primary way text reaches an agent and it already works. It also has four ways to be
 * unavailable — setup not run, permission refused, no host session, a noisy room — and a
 * controller-only user with no keyboard then has no way to say anything at all. That is the whole
 * loop stopping on a dependency that is not always met.
 *
 * So: a small vocabulary that needs nothing but a button. It is deliberately small. These are the
 * things a person says to an agent mid-task without thinking, not an attempt at a language, and
 * the set is experiment data like every preset — `contractual: false`, replaceable, not a product
 * vocabulary anybody has agreed to.
 *
 * Non-destructive by construction: every one of them is text, and the agent decides what to do
 * with it. Nothing here stops, closes or deletes anything (WHEEL-R7).
 */

export const AGENT_REPLY_IDS = {
  continue: 'agent.reply.continue',
  yes: 'agent.reply.yes',
  no: 'agent.reply.no',
  explain: 'agent.reply.explain'
} as const

export type AgentReply = {
  readonly id: string
  readonly label: string
  /** Sent through the chat's existing send callback, exactly as a typed message would be. */
  readonly text: string
}

export const AGENT_REPLIES: readonly AgentReply[] = [
  { id: AGENT_REPLY_IDS.continue, label: 'Continue', text: 'Continue.' },
  { id: AGENT_REPLY_IDS.yes, label: 'Yes', text: 'Yes, go ahead.' },
  { id: AGENT_REPLY_IDS.no, label: 'No', text: 'No, stop and explain first.' },
  { id: AGENT_REPLY_IDS.explain, label: 'Explain', text: 'Explain what you just did and why.' }
]

/**
 * Wheel actions for the replies. Unavailable while the composer cannot accept a send — the chat
 * already decides that, and a reply the Send button would refuse must not be reachable by
 * another route.
 */
export function agentReplyActions(
  send: (text: string) => void,
  canSend: boolean
): readonly WheelActionBinding[] {
  return AGENT_REPLIES.map((reply) => ({
    id: reply.id,
    label: reply.label,
    availability: canSend ? 'available' : 'unavailable',
    run: () => send(reply.text)
  }))
}
