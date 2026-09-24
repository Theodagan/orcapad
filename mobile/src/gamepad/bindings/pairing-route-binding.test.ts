import { describe, expect, it, vi } from 'vitest'
import { pairingRouteBinding } from './pairing-route-binding'

describe('pairing route binding', () => {
  it('invokes the screen’s own callbacks, once each', () => {
    const confirm = vi.fn()
    const back = vi.fn()
    const { focusTarget } = pairingRouteBinding('pair-confirm', { confirm, back })

    focusTarget.handle({ kind: 'confirm' })
    focusTarget.handle({ kind: 'back' })

    expect(confirm).toHaveBeenCalledTimes(1)
    expect(back).toHaveBeenCalledTimes(1)
  })

  // The swallow bug: accepting a kind with nothing behind it would take the intent away from
  // anything else that might have answered it (`001` §7 step 4).
  it('accepts only what the screen is currently showing', () => {
    const { focusTarget } = pairingRouteBinding('pair-scan', { confirm: null, back: vi.fn() })

    expect([...focusTarget.accepts]).toEqual(['back'])
  })

  it('does nothing at all mid-connect', () => {
    const { focusTarget } = pairingRouteBinding('pair-confirm', { confirm: null, back: null })

    expect([...focusTarget.accepts]).toEqual([])
    // Still total: an intent it never accepted cannot throw its way out of the registry.
    expect(() => focusTarget.handle({ kind: 'confirm' })).not.toThrow()
  })

  it('names no wheel action — a two-button screen has nothing a wheel could add', () => {
    expect(pairingRouteBinding('pair-scan', { confirm: null, back: null }).wheelActions).toEqual([])
  })
})
