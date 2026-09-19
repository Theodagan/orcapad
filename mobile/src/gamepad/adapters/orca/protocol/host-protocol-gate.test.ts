import { describe, expect, it } from 'vitest'
import {
  MIN_COMPATIBLE_RUNTIME_CLIENT_VERSION,
  MIN_COMPATIBLE_RUNTIME_SERVER_VERSION,
  RUNTIME_PROTOCOL_VERSION
} from '../../../../../../src/shared/protocol-version'
import type { RpcResponse } from '../../../../transport/types'
import { projectHostCapabilities, readHostProtocolGate } from './host-protocol-gate'

function replyWith(result: unknown): { sendRequest: () => Promise<RpcResponse> } {
  return {
    sendRequest: () => Promise.resolve({ id: '1', ok: true, result, _meta: { runtimeId: 'r' } })
  }
}

function refuses(): { sendRequest: () => Promise<RpcResponse> } {
  return {
    sendRequest: () =>
      Promise.resolve({
        id: '1',
        ok: false,
        error: { code: 'method_not_found', message: 'status.get' },
        _meta: { runtimeId: 'r' }
      })
  }
}

describe('host protocol gate', () => {
  it('reads a current host from the runtime-named fields', () => {
    const host = projectHostCapabilities({
      runtimeProtocolVersion: RUNTIME_PROTOCOL_VERSION,
      minCompatibleRuntimeClientVersion: MIN_COMPATIBLE_RUNTIME_CLIENT_VERSION,
      appVersion: '1.2.3',
      capabilities: ['terminal.binary-stream.v1', 'agent-session.structured.v1']
    })

    expect(host.variant).toBe('runtime')
    expect(host.protocolVersion).toBe(RUNTIME_PROTOCOL_VERSION)
    expect(host.minCompatibleClientVersion).toBe(MIN_COMPATIBLE_RUNTIME_CLIENT_VERSION)
    expect(host.appVersion).toBe('1.2.3')
    expect(host.advertised?.has('agent-session.structured.v1')).toBe(true)
    expect(host.compat.kind).toBe('ok')
  })

  it('accepts a host sitting exactly on the compatibility floor', () => {
    const host = projectHostCapabilities({
      runtimeProtocolVersion: MIN_COMPATIBLE_RUNTIME_SERVER_VERSION,
      minCompatibleRuntimeClientVersion: RUNTIME_PROTOCOL_VERSION,
      capabilities: []
    })

    expect(host.compat.kind).toBe('ok')
    // An empty list is a host that advertises nothing, which is not a host that predates the field.
    expect(host.advertised).toEqual(new Set())
  })

  it('blocks a host below the floor, and a host that wants a newer client', () => {
    const tooOld = projectHostCapabilities({
      runtimeProtocolVersion: MIN_COMPATIBLE_RUNTIME_SERVER_VERSION - 1
    })
    expect(tooOld.compat.kind).toBe('blocked')
    if (tooOld.compat.kind === 'blocked') {
      expect(tooOld.compat.reason).toBe('server-too-old')
    }

    const wantsNewerClient = projectHostCapabilities({
      runtimeProtocolVersion: RUNTIME_PROTOCOL_VERSION,
      minCompatibleRuntimeClientVersion: RUNTIME_PROTOCOL_VERSION + 1
    })
    expect(wantsNewerClient.compat.kind).toBe('blocked')
    if (wantsNewerClient.compat.kind === 'blocked') {
      expect(wantsNewerClient.compat.reason).toBe('client-too-old')
    }
  })

  it('falls back to the COMPAT aliases an older host still sends', () => {
    const host = projectHostCapabilities({
      protocolVersion: RUNTIME_PROTOCOL_VERSION,
      minCompatibleMobileVersion: MIN_COMPATIBLE_RUNTIME_CLIENT_VERSION
    })

    expect(host.variant).toBe('legacy-alias')
    expect(host.protocolVersion).toBe(RUNTIME_PROTOCOL_VERSION)
    expect(host.minCompatibleClientVersion).toBe(MIN_COMPATIBLE_RUNTIME_CLIENT_VERSION)
  })

  it('prefers the runtime field when a host sends both', () => {
    const host = projectHostCapabilities({
      runtimeProtocolVersion: 9,
      protocolVersion: 3,
      minCompatibleRuntimeClientVersion: 4,
      minCompatibleMobileVersion: 2
    })

    expect(host.protocolVersion).toBe(9)
    expect(host.minCompatibleClientVersion).toBe(4)
  })

  it('reads an absent field as "host predates it", never as a value', () => {
    const host = projectHostCapabilities({ runtimeId: 'r' })

    expect(host.variant).toBe('silent')
    expect(host.protocolVersion).toBeNull()
    expect(host.minCompatibleClientVersion).toBeNull()
    expect(host.appVersion).toBeNull()
    // The distinction the whole gate exists for: nothing said, not "advertises nothing".
    expect(host.advertised).toBeNull()
  })

  it('ignores fields of the wrong type rather than trusting them', () => {
    const host = projectHostCapabilities({
      runtimeProtocolVersion: 'three',
      appVersion: '',
      capabilities: ['ok.v1', 7, null]
    })

    expect(host.protocolVersion).toBeNull()
    expect(host.appVersion).toBeNull()
    expect(host.advertised).toEqual(new Set(['ok.v1']))
  })

  it('answers null when the host refuses the method', async () => {
    await expect(readHostProtocolGate(refuses())).resolves.toBeNull()
  })

  it('answers null when the reply is not an object', async () => {
    await expect(readHostProtocolGate(replyWith('nope'))).resolves.toBeNull()
  })

  it('projects a real reply end to end', async () => {
    const host = await readHostProtocolGate(
      replyWith({
        runtimeProtocolVersion: RUNTIME_PROTOCOL_VERSION,
        minCompatibleRuntimeClientVersion: MIN_COMPATIBLE_RUNTIME_CLIENT_VERSION,
        appVersion: '2.0.0',
        capabilities: ['files.pathsExist']
      })
    )

    expect(host?.appVersion).toBe('2.0.0')
    expect(host?.compat.kind).toBe('ok')
  })
})
