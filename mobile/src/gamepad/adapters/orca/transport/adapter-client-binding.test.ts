import { describe, expect, it, vi } from 'vitest'
import { connectionId } from '../../../domain/connection'
import type { RpcClient } from '../../../../transport/rpc-client'
import type { RpcClientContextValue } from '../../../../transport/rpc-client-context-contract'
import type { MobileConnectionPath } from '../../../../transport/stable-logical-rpc-client'
import type { ConnectionState } from '../../../../transport/types'
import {
  createAdapterClientBinding,
  toConnection,
  toConnectionPath,
  toReachability
} from './adapter-client-binding'

const id = connectionId('host-1')

type StoreOverrides = Partial<RpcClientContextValue>

/**
 * A stand-in for `RpcClientProvider`'s value. Only the members the binding touches are given
 * behaviour; the rest throw, so a binding that quietly grew a new dependency on the transport
 * fails here rather than in an app that has one.
 */
function fakeStore(overrides: StoreOverrides = {}): RpcClientContextValue {
  const refuse = (name: string) => () => {
    throw new Error(`binding reached an unexpected store member: ${name}`)
  }
  return {
    acquire: refuse('acquire'),
    release: refuse('release'),
    releaseAndCloseIfUnused: refuse('releaseAndCloseIfUnused'),
    closeIfUnused: refuse('closeIfUnused'),
    forceReconnect: refuse('forceReconnect'),
    refreshHostClient: refuse('refreshHostClient'),
    forgetHostClient: refuse('forgetHostClient'),
    disconnectHostClient: refuse('disconnectHostClient'),
    getState: refuse('getState'),
    getKnownState: refuse('getKnownState'),
    getClientId: refuse('getClientId'),
    getReconnectAttempt: refuse('getReconnectAttempt'),
    getLastConnectedAt: refuse('getLastConnectedAt'),
    getActivePath: refuse('getActivePath'),
    getPendingPath: refuse('getPendingPath'),
    isPairingRejected: refuse('isPairingRejected'),
    isHostSignedOut: refuse('isHostSignedOut'),
    subscribeHostState: refuse('subscribeHostState'),
    getAllClients: refuse('getAllClients'),
    subscribeAllHosts: refuse('subscribeAllHosts'),
    primeHosts: refuse('primeHosts'),
    ...overrides
  }
}

function reading(
  state: ConnectionState,
  path: MobileConnectionPath,
  lastConnectedAt: number | null,
  known: ConnectionState | null = state
): StoreOverrides {
  return {
    getState: () => state,
    getKnownState: () => known,
    getActivePath: () => path,
    getLastConnectedAt: () => lastConnectedAt
  }
}

describe('connection state projection', () => {
  it('maps every transport state onto the three-value domain vocabulary', () => {
    expect(toReachability('connected')).toBe('connected')
    expect(toReachability('connecting')).toBe('connecting')
    expect(toReachability('handshaking')).toBe('connecting')
    expect(toReachability('reconnecting')).toBe('connecting')
    expect(toReachability('disconnected')).toBe('unreachable')
    // A host that will not authenticate is one we cannot reach; pairing owns the repair.
    expect(toReachability('auth-failed')).toBe('unreachable')
  })

  it('treats every direct route as local and only the relay as relay', () => {
    expect(toConnectionPath('lan')).toBe('local')
    expect(toConnectionPath('tailscale')).toBe('local')
    expect(toConnectionPath('relay')).toBe('relay')
    expect(toConnectionPath(null)).toBe('unknown')
  })

  it('assembles a Connection from transport facts and the identity it cannot know', () => {
    const connection = toConnection(
      id,
      { reachability: 'connected', path: 'relay', lastContactAt: 1_700_000 },
      { label: 'studio', hostVersion: '1.2.3', protocolVersion: 3 }
    )

    expect(connection).toEqual({
      id,
      label: 'studio',
      reachability: 'connected',
      path: 'relay',
      hostVersion: '1.2.3',
      protocolVersion: 3,
      lastContactAt: 1_700_000
    })
  })
})

describe('adapter client binding', () => {
  it('acquires the shared client from the store rather than opening one', () => {
    // SAFETY: the binding hands the client straight back without reading it, so this test only
    // needs a distinguishable reference. Giving it real RpcClient members would assert nothing.
    const client = {} as RpcClient
    const acquire = vi.fn(() => client)
    const binding = createAdapterClientBinding(fakeStore({ acquire }))

    expect(binding.acquire(id)).toBe(client)
    expect(acquire).toHaveBeenCalledTimes(1)
    expect(acquire.mock.calls[0]?.[0]).toBe('host-1')
  })

  it('passes the same holder token on every call, so one binding is one holder', () => {
    const acquire = vi.fn(() => null)
    const releaseAndCloseIfUnused = vi.fn()
    const binding = createAdapterClientBinding(fakeStore({ acquire, releaseAndCloseIfUnused }))

    binding.acquire(id)
    binding.acquire(connectionId('host-2'))
    binding.release(id)

    const holder = acquire.mock.calls[0]?.[1]
    expect(acquire.mock.calls[1]?.[1]).toBe(holder)
    expect(releaseAndCloseIfUnused.mock.calls[0]?.[1]).toBe(holder)
  })

  it('reports null when the store cannot open the host', () => {
    const binding = createAdapterClientBinding(fakeStore({ acquire: () => null }))

    expect(binding.acquire(id)).toBeNull()
  })

  it('releases without closing a socket another holder still wants', () => {
    const releaseAndCloseIfUnused = vi.fn()
    const closeIfUnused = vi.fn()
    const binding = createAdapterClientBinding(
      fakeStore({ releaseAndCloseIfUnused, closeIfUnused })
    )

    binding.release(id)

    expect(releaseAndCloseIfUnused).toHaveBeenCalledTimes(1)
    // Not the blunt close: the registry decides, because other screens may still hold the host.
    expect(closeIfUnused).not.toHaveBeenCalled()
  })

  it('projects the live transport reading into domain facts', () => {
    const binding = createAdapterClientBinding(
      fakeStore(reading('reconnecting', 'relay', 1_700_000))
    )

    expect(binding.factsOf(id)).toEqual({
      reachability: 'connecting',
      path: 'relay',
      lastContactAt: 1_700_000
    })
  })

  it('reports an unopened host as unknown path rather than inventing one', () => {
    const binding = createAdapterClientBinding(
      fakeStore(reading('disconnected', 'lan', null, null))
    )

    expect(binding.factsOf(id)).toEqual({
      reachability: 'unreachable',
      path: 'unknown',
      lastContactAt: null
    })
  })

  it('emits current facts on subscribe and again on every state change', () => {
    let notify = (): void => {}
    let state: ConnectionState = 'connecting'
    const unsubscribe = vi.fn()
    const binding = createAdapterClientBinding(
      fakeStore({
        getState: () => state,
        getKnownState: () => state,
        getActivePath: () => 'lan',
        getLastConnectedAt: () => null,
        subscribeHostState: (_hostId, listener) => {
          notify = () => listener(state)
          return unsubscribe
        }
      })
    )

    const seen: string[] = []
    const stop = binding.observeFacts(id)((facts) => seen.push(facts.reachability))

    expect(seen).toEqual(['connecting'])

    state = 'connected'
    notify()
    expect(seen).toEqual(['connecting', 'connected'])

    stop()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('forwards reconnect and disconnect to the store that owns the socket', async () => {
    const forceReconnect = vi.fn(() => Promise.resolve())
    const disconnectHostClient = vi.fn()
    const binding = createAdapterClientBinding(fakeStore({ forceReconnect, disconnectHostClient }))

    await binding.reconnect(id)
    binding.disconnect(id)

    expect(forceReconnect).toHaveBeenCalledWith('host-1')
    expect(disconnectHostClient).toHaveBeenCalledWith('host-1')
  })
})
