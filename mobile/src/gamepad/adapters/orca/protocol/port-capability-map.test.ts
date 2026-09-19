import { describe, expect, it } from 'vitest'
import { projectHostCapabilities } from './host-protocol-gate'
import { createPortCapabilityMap, type PortCapabilityRequirement } from './port-capability-map'
import {
  MIN_COMPATIBLE_RUNTIME_SERVER_VERSION,
  RUNTIME_PROTOCOL_VERSION
} from '../../../../../../src/shared/protocol-version'

// Fixtures, not the real table: requirements belong to the feature that owns the port, so the
// foundation tests the rules against shapes rather than against any particular port.
const requirements: readonly PortCapabilityRequirement[] = [
  { portMethod: 'always.there', advertises: null, sinceProtocolVersion: null },
  { portMethod: 'needs.badge', advertises: 'demo.badge.v1', sinceProtocolVersion: null },
  { portMethod: 'needs.version', advertises: null, sinceProtocolVersion: 5 }
]

function currentHost(capabilities: readonly string[] = ['demo.badge.v1']) {
  return projectHostCapabilities({
    runtimeProtocolVersion: RUNTIME_PROTOCOL_VERSION,
    minCompatibleRuntimeClientVersion: 1,
    appVersion: '1.0.0',
    capabilities: [...capabilities]
  })
}

describe('port capability map', () => {
  it('knows nothing until a host answers', () => {
    const map = createPortCapabilityMap(requirements)

    expect(map.capabilityOf('always.there')).toBe('unknown')

    map.observeHost(null)
    expect(map.capabilityOf('always.there')).toBe('unknown')
  })

  it('reads an advertised capability as available and a missing one as unavailable', () => {
    const map = createPortCapabilityMap(requirements)
    map.observeHost(currentHost())

    expect(map.capabilityOf('always.there')).toBe('available')
    expect(map.capabilityOf('needs.badge')).toBe('available')

    map.observeHost(currentHost([]))
    expect(map.capabilityOf('needs.badge')).toBe('unavailable')
  })

  it('stays unknown when the host predates capability advertisement', () => {
    const map = createPortCapabilityMap(requirements)
    map.observeHost(
      projectHostCapabilities({
        runtimeProtocolVersion: RUNTIME_PROTOCOL_VERSION,
        appVersion: '0.9'
      })
    )

    // No `capabilities` key at all: the host said nothing, so neither do we.
    expect(map.capabilityOf('needs.badge')).toBe('unknown')
    // A method with no advertisement requirement still resolves.
    expect(map.capabilityOf('always.there')).toBe('available')
  })

  it('stays unknown about a protocol floor when the host never said its version', () => {
    const map = createPortCapabilityMap(requirements)
    map.observeHost(projectHostCapabilities({ capabilities: [] }))

    expect(map.capabilityOf('needs.version')).toBe('unknown')
  })

  it('reads a protocol floor the host does not meet as unavailable', () => {
    const map = createPortCapabilityMap(requirements)
    map.observeHost(currentHost())

    expect(map.capabilityOf('needs.version')).toBe('unavailable')
  })

  it('is unknown about a method nobody declared', () => {
    const map = createPortCapabilityMap(requirements)
    map.observeHost(currentHost())

    expect(map.capabilityOf('never.declared')).toBe('unknown')
  })

  it('still answers per method on a host the compat verdict blocks', () => {
    const blocked = projectHostCapabilities({
      runtimeProtocolVersion: MIN_COMPATIBLE_RUNTIME_SERVER_VERSION - 1,
      capabilities: ['demo.badge.v1']
    })
    expect(blocked.compat.kind).toBe('blocked')

    const map = createPortCapabilityMap(requirements)
    map.observeHost(blocked)

    // Whether to talk to this build at all is 001-pairing's call, not the capability map's.
    // Reporting `unavailable` here would claim the methods are missing, which we have not learned.
    expect(map.capabilityOf('needs.badge')).toBe('available')
    expect(map.capabilityOf('needs.version')).toBe('unavailable')
  })

  it('caches a method-not-found refusal over anything the host advertised', () => {
    const map = createPortCapabilityMap(requirements)
    map.observeHost(currentHost())
    expect(map.capabilityOf('needs.badge')).toBe('available')

    map.noteMethodNotFound('needs.badge')
    expect(map.capabilityOf('needs.badge')).toBe('unavailable')

    // A reconnect to the same build re-proves nothing: the method is still missing.
    map.observeHost(currentHost())
    expect(map.capabilityOf('needs.badge')).toBe('unavailable')
  })

  it('clears the refusal cache when the host comes back on a different build', () => {
    const map = createPortCapabilityMap(requirements)
    map.observeHost(currentHost())
    map.noteMethodNotFound('needs.badge')
    expect(map.capabilityOf('needs.badge')).toBe('unavailable')

    map.observeHost(
      projectHostCapabilities({
        runtimeProtocolVersion: RUNTIME_PROTOCOL_VERSION,
        minCompatibleRuntimeClientVersion: 1,
        appVersion: '1.0.1',
        capabilities: ['demo.badge.v1']
      })
    )

    expect(map.capabilityOf('needs.badge')).toBe('available')
  })

  it('clears the refusal cache when the host protocol version moves', () => {
    const map = createPortCapabilityMap(requirements)
    map.observeHost(currentHost())
    map.noteMethodNotFound('always.there')

    map.observeHost(
      projectHostCapabilities({
        runtimeProtocolVersion: RUNTIME_PROTOCOL_VERSION + 1,
        minCompatibleRuntimeClientVersion: 1,
        appVersion: '1.0.0',
        capabilities: ['demo.badge.v1']
      })
    )

    expect(map.capabilityOf('always.there')).toBe('available')
  })
})
