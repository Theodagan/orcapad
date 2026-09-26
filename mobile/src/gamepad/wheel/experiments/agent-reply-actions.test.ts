import { describe, expect, it, vi } from 'vitest'
import { AGENT_REPLIES, AGENT_REPLY_IDS, agentReplyActions } from './agent-reply-actions'

describe('canned agent replies', () => {
  it('offers every reply as a wheel action', () => {
    const actions = agentReplyActions(vi.fn(), true)

    expect(actions.map((action) => action.id)).toEqual(AGENT_REPLIES.map((reply) => reply.id))
  })

  it('sends the reply text through the chat’s own send', () => {
    const send = vi.fn()
    const actions = agentReplyActions(send, true)

    actions.find((action) => action.id === AGENT_REPLY_IDS.continue)?.run()

    expect(send).toHaveBeenCalledWith('Continue.')
  })

  // A reply the Send button would refuse must not be reachable by another route.
  it('goes unavailable while the composer cannot send', () => {
    const actions = agentReplyActions(vi.fn(), false)

    expect(actions.every((action) => action.availability === 'unavailable')).toBe(true)
  })

  // WHEEL-R7: everything here is text, and the agent decides what to do with it.
  it('reaches nothing destructive', () => {
    for (const reply of AGENT_REPLIES) {
      expect(reply.id.startsWith('agent.reply.')).toBe(true)
      expect(reply.text.length).toBeGreaterThan(0)
    }
  })

  it('stays small enough to be a wheel', () => {
    // Four segments is the easy case the smoke presets already showed works.
    expect(AGENT_REPLIES.length).toBeLessThanOrEqual(6)
  })
})
