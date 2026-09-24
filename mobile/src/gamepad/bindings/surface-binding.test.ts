import { describe, expect, it, vi } from 'vitest'
import { focusTargetFor } from './surface-binding'

describe('focus target from handler entries', () => {
  it('accepts exactly what it has a handler for', () => {
    const target = focusTargetFor('surface', [
      ['confirm', vi.fn()],
      ['scroll', vi.fn()]
    ])

    expect([...target.accepts].sort()).toEqual(['confirm', 'scroll'])
  })

  it('routes each intent to its own handler, with the payload intact', () => {
    const scroll = vi.fn()
    const confirm = vi.fn()
    const target = focusTargetFor('surface', [
      ['confirm', confirm],
      ['scroll', scroll]
    ])

    target.handle({ kind: 'scroll', direction: 'down', velocity: 0.5 })

    expect(scroll).toHaveBeenCalledWith({ kind: 'scroll', direction: 'down', velocity: 0.5 })
    expect(confirm).not.toHaveBeenCalled()
  })

  it('ignores an intent it never accepted', () => {
    const target = focusTargetFor('surface', [['confirm', vi.fn()]])

    expect(() => target.handle({ kind: 'stop' })).not.toThrow()
  })

  it('carries a dictation target through when one is given', () => {
    const onTranscript = vi.fn()
    expect(focusTargetFor('surface', [], { onTranscript }).textTarget).toEqual({ onTranscript })
    expect(focusTargetFor('surface', []).textTarget).toBeUndefined()
  })
})
