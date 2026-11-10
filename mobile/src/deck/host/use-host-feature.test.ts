import { describe, expect, it } from 'vitest'
import { disabledReasonText } from './disabled-reason'
import { resolveHostFeature } from './host-feature'

const translate = (_key: string, fallback?: string): string => fallback ?? _key

describe('host feature gate', () => {
  it('offers a feature the desktop declared', () => {
    expect(
      resolveHostFeature({
        feature: 'agent-history',
        capabilities: ['aiVault.v1'],
        connected: true,
        statusReadable: true
      })
    ).toEqual({ available: true })
  })

  it('refuses a feature the desktop did not declare, with the declared reason', () => {
    expect(
      resolveHostFeature({
        feature: 'agent-history',
        capabilities: [],
        connected: true,
        statusReadable: true
      })
    ).toEqual({ available: false, reason: 'not-declared' })
  })

  it('separates a disconnected desktop from one that answered without the capability', () => {
    expect(
      resolveHostFeature({
        feature: 'quick-commands',
        capabilities: ['aiVault.v1'],
        connected: false,
        statusReadable: true
      })
    ).toEqual({ available: false, reason: 'not-connected' })
    expect(
      resolveHostFeature({
        feature: 'quick-commands',
        capabilities: undefined,
        connected: true,
        statusReadable: false
      })
    ).toEqual({ available: false, reason: 'unknown-host' })
  })

  it('reads each feature through its own declared capability', () => {
    const capabilities = ['terminal.quick-commands.v1']
    expect(
      resolveHostFeature({
        feature: 'quick-commands',
        capabilities,
        connected: true,
        statusReadable: true
      })
    ).toEqual({ available: true })
    expect(
      resolveHostFeature({
        feature: 'structured-agent-session',
        capabilities,
        connected: true,
        statusReadable: true
      })
    ).toEqual({ available: false, reason: 'not-declared' })
  })

  it('names the feature and the reason in one sentence', () => {
    expect(disabledReasonText(translate, 'not-declared', 'agent-history')).toBe(
      'Agent history — This desktop does not provide it.'
    )
    expect(disabledReasonText(translate, 'not-connected')).toBe('This desktop is not connected.')
  })
})
