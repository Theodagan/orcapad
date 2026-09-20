import type { Subscription, Unsubscribe } from '../../../application/ports/subscription'
import type {
  Connection,
  ConnectionId,
  ConnectionPath,
  ConnectionReachability
} from '../../../domain/connection'
import type { HostClientAcquisition } from '../../../../transport/host-client-acquisition-registry'
import type { RpcClient } from '../../../../transport/rpc-client'
import type { RpcClientContextValue } from '../../../../transport/rpc-client-context-contract'
import type { MobileConnectionPath } from '../../../../transport/stable-logical-rpc-client'
import type { ConnectionState } from '../../../../transport/types'

/**
 * The seam between the adapter and the transport the app already has. It opens no socket and
 * schedules no reconnect: `RpcClientProvider` owns one shared client per host, the acquisition
 * registry owns its lifetime, and this binding is a reader with a hold on it.
 *
 * A `ConnectionId` is a paired host's id. That equivalence is asserted in exactly one place —
 * here — so no other module has to know it, and the domain never learns the word "host".
 */

/** What the transport alone can testify to. The catalog supplies the label, the protocol gate the versions. */
export type TransportConnectionFacts = {
  readonly reachability: ConnectionReachability
  readonly path: ConnectionPath
  readonly lastContactAt: number | null
}

/** The rest of a `Connection`, which the transport cannot know. */
export type ConnectionIdentity = {
  readonly label: string
  readonly hostVersion: string | null
  readonly protocolVersion: number | null
}

export type AdapterClientBinding = {
  /** Acquires the shared client and holds it. `null` when the host cannot be opened. */
  readonly acquire: (id: ConnectionId) => RpcClient | null
  /** Drops this binding's hold. The store closes the socket only once nothing else holds it. */
  readonly release: (id: ConnectionId) => void
  readonly factsOf: (id: ConnectionId) => TransportConnectionFacts
  readonly observeFacts: (id: ConnectionId) => Subscription<TransportConnectionFacts>
  readonly reconnect: (id: ConnectionId) => Promise<void>
  readonly disconnect: (id: ConnectionId) => void
}

/**
 * `auth-failed` lands on `unreachable` rather than a state of its own: the domain vocabulary has
 * three values and a host that will not authenticate is one the controller cannot reach. Pairing
 * owns the repair, and reads the rejection from the store directly.
 */
export function toReachability(state: ConnectionState): ConnectionReachability {
  switch (state) {
    case 'connected':
      return 'connected'
    case 'connecting':
    case 'handshaking':
    case 'reconnecting':
      return 'connecting'
    case 'disconnected':
    case 'auth-failed':
      return 'unreachable'
  }
}

/**
 * Tailscale is a direct path, so it projects to `local` alongside LAN — the domain distinction is
 * "reached the host ourselves" against "went through the relay", not which direct route won.
 * Which of the two it was stays available on the store for a diagnostics surface.
 */
export function toConnectionPath(path: MobileConnectionPath | null): ConnectionPath {
  if (path === null) {
    return 'unknown'
  }
  return path === 'relay' ? 'relay' : 'local'
}

export function toConnection(
  id: ConnectionId,
  facts: TransportConnectionFacts,
  identity: ConnectionIdentity
): Connection {
  return {
    id,
    label: identity.label,
    reachability: facts.reachability,
    path: facts.path,
    hostVersion: identity.hostVersion,
    protocolVersion: identity.protocolVersion,
    lastContactAt: facts.lastContactAt
  }
}

export function createAdapterClientBinding(store: RpcClientContextValue): AdapterClientBinding {
  // The registry compares references and never reads fields, so one token per binding is the
  // whole identity. Frozen so a stray write cannot make two holders look like one.
  const holder: HostClientAcquisition = Object.freeze({})

  function factsOf(id: ConnectionId): TransportConnectionFacts {
    // A host the store has never opened has no active path to report, and `getActivePath`
    // answers with its default rather than null — so absence of a known state is what
    // distinguishes "never reached" from "reached over LAN".
    const known = store.getKnownState(id)
    return {
      reachability: toReachability(store.getState(id)),
      path: toConnectionPath(known === null ? null : store.getActivePath(id)),
      lastContactAt: store.getLastConnectedAt(id)
    }
  }

  return {
    acquire: (id) => store.acquire(id, holder),
    release: (id) => {
      store.releaseAndCloseIfUnused(id, holder)
    },
    factsOf,
    observeFacts:
      (id) =>
      (listener): Unsubscribe => {
        // The store notifies on connection state; path and contact time move with it.
        const unsubscribe = store.subscribeHostState(id, () => {
          listener(factsOf(id))
        })
        listener(factsOf(id))
        return unsubscribe
      },
    reconnect: (id) => store.forceReconnect(id),
    disconnect: (id) => {
      store.disconnectHostClient(id)
    }
  }
}
