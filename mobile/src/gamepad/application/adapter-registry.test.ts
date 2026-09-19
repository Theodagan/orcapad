import { afterEach, describe, expect, it } from 'vitest'
import {
  bindAdapter,
  boundGamepadAdapter,
  isAdapterBound,
  resetAdapterRegistryForTests
} from './adapter-registry'
import type { GamepadAdapter } from './ports/gamepad-adapter'
import { unsupported } from './ports/unsupported'

// The registry lives in application/, which may not import adapters/ — so the fixture is a
// an adapter literal rather than createStubAdapter(). That constraint is the rule working.
const stubAdapter: GamepadAdapter = { kind: 'stub' }

afterEach(() => {
  resetAdapterRegistryForTests()
})

describe('adapter registry', () => {
  it('refuses to answer before the shell binds a runtime', () => {
    expect(isAdapterBound()).toBe(false)
    expect(() => boundGamepadAdapter()).toThrow(/No adapter is bound/)
  })

  it('hands every reader the bound runtime', () => {
    bindAdapter(stubAdapter)

    expect(isAdapterBound()).toBe(true)
    expect(boundGamepadAdapter()).toBe(stubAdapter)
  })

  it('swaps the runtime in place, which is what extraction does', () => {
    bindAdapter(stubAdapter)
    bindAdapter({ kind: 'orca' })

    expect(boundGamepadAdapter().kind).toBe('orca')
  })
})

describe('unsupported', () => {
  it('is a terminal failure, so a feature hides the affordance instead of retrying', () => {
    const result = unsupported<string>('listProjects')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.failure.kind).toBe('unsupported')
      expect(result.failure.retryable).toBe(false)
      expect(result.failure.message).toContain('listProjects')
    }
  })
})
