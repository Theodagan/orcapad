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

    const intent = {
      kind: 'scroll',
      direction: 'down',
      velocity: 0.5,
      elapsedMs: 16,
      begins: true
    } as const
    target.handle(intent)

    expect(scroll).toHaveBeenCalledWith(intent)
    expect(confirm).not.toHaveBeenCalled()
  })

  it('ignores an intent it never accepted', () => {
    const target = focusTargetFor('surface', [['confirm', vi.fn()]])

    expect(() => target.handle({ kind: 'back' })).not.toThrow()
  })
})
