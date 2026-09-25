import { describe, expect, it, vi } from 'vitest'
import { resolveAgentIntervention } from './agent-intervention'

const prompt = { itemId: 'item-1', expectedRevision: 3 }

describe('agent intervention', () => {
  it('has nothing to answer when no prompt is on screen', () => {
    expect(resolveAgentIntervention({})).toBeNull()
    expect(resolveAgentIntervention({ ask: null, permission: null, question: null })).toBeNull()
  })

  // Mirrors MobileNativeChatPromptCard: ask wins, then permission, then question. The controller
  // has to agree with the one card the user can actually see.
  it('follows the card’s own precedence', () => {
    const every = {
      ask: { questions: [] },
      permission: { options: [{ send: '1' }] },
      question: {}
    }
    expect(resolveAgentIntervention(every)?.kind).toBe('ask')
    expect(resolveAgentIntervention({ ...every, ask: null })?.kind).toBe('permission')
    expect(resolveAgentIntervention({ ...every, ask: null, permission: null })?.kind).toBe(
      'question'
    )
  })

  it('accepts a permission with the affirmative the card renders first', () => {
    const onRespondPermission = vi.fn()
    const intervention = resolveAgentIntervention({
      permission: { options: [{ send: '1' }, { send: '\u001b' }] },
      onRespondPermission
    })

    intervention?.accept?.()

    expect(onRespondPermission).toHaveBeenCalledWith('1')
  })

  // The refusal that matters. Both of these are lists of peers, and picking the first would
  // answer "Delete everything?" with whatever the agent happened to list first.
  it('refuses to guess an answer for an ask or a question', () => {
    expect(resolveAgentIntervention({ ask: { questions: [] } })?.accept).toBeNull()
    expect(resolveAgentIntervention({ question: {} })?.accept).toBeNull()
  })

  it('rejects each kind through the callback its card uses', () => {
    const onCancelAsk = vi.fn()
    const onCancelPrompt = vi.fn()

    resolveAgentIntervention({ ask: { questions: [] }, onCancelAsk, onCancelPrompt })?.reject?.()
    expect(onCancelAsk).toHaveBeenCalledTimes(1)
    expect(onCancelPrompt).not.toHaveBeenCalled()

    resolveAgentIntervention({ permission: { options: [], prompt }, onCancelPrompt })?.reject?.()
    expect(onCancelPrompt).toHaveBeenCalledWith(prompt)

    resolveAgentIntervention({ question: { prompt }, onCancelPrompt })?.reject?.()
    expect(onCancelPrompt).toHaveBeenLastCalledWith(prompt)
  })

  it('offers no action at all when the surface supplies no callback', () => {
    const intervention = resolveAgentIntervention({ permission: { options: [{ send: '1' }] } })

    expect(intervention?.accept).toBeNull()
    expect(intervention?.reject).toBeNull()
  })

  it('cannot accept a permission that renders no options', () => {
    const onRespondPermission = vi.fn()
    const intervention = resolveAgentIntervention({
      permission: { options: [] },
      onRespondPermission
    })

    expect(intervention?.accept).toBeNull()
  })
})
