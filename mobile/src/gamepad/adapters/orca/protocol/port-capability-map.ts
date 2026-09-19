import type { Capability } from '../../../application/ports/capability'
import type { HostCapabilities } from './host-protocol-gate'

/**
 * Per-port-method capability for one connection (FND-R7). Three states, and `unknown` never
 * collapses into `unavailable`: a host that predates capability advertisement has told us nothing,
 * which is not the same as telling us no. A feature renders the two differently — an unproven
 * affordance may still be offered, a refused one must not be.
 *
 * Requirements are declared by the feature that owns the port, not here. The foundation owns the
 * rules; `001`–`007` each register their own methods as they land.
 */

export type PortCapabilityRequirement = {
  /** The port method, e.g. `session.createTerminalSession`. Never an Orca RPC method name. */
  readonly portMethod: string
  /** A runtime capability string the host must advertise, or null when presence is not advertised. */
  readonly advertises: string | null
  /** A protocol floor the host must meet, or null when the method predates the compatibility window. */
  readonly sinceProtocolVersion: number | null
}

export type PortCapabilityMap = {
  readonly capabilityOf: (portMethod: string) => Capability
  /** Records what `status.get` answered. `null` means the host refused or was never asked. */
  readonly observeHost: (host: HostCapabilities | null) => void
  /** A `method not found` refusal: this host does not have the method, whatever it advertised. */
  readonly noteMethodNotFound: (portMethod: string) => void
}

/**
 * What a cached refusal is pinned to. A reconnect to the same host build keeps the cache — the
 * refusal is still true — while a host that came back on a different version or app build has to
 * re-prove itself, because an update is exactly when a missing method appears.
 */
function hostGeneration(host: HostCapabilities | null): string {
  if (host === null) {
    return 'absent'
  }
  return `${host.protocolVersion ?? 'none'}:${host.appVersion ?? 'none'}`
}

export function createPortCapabilityMap(
  requirements: readonly PortCapabilityRequirement[]
): PortCapabilityMap {
  const byPortMethod = new Map(
    requirements.map((requirement) => [requirement.portMethod, requirement])
  )
  const refused = new Set<string>()
  let host: HostCapabilities | null = null
  let generation = hostGeneration(null)

  function observeHost(next: HostCapabilities | null): void {
    const nextGeneration = hostGeneration(next)
    if (nextGeneration !== generation) {
      refused.clear()
      generation = nextGeneration
    }
    host = next
  }

  function capabilityOf(portMethod: string): Capability {
    if (refused.has(portMethod)) {
      return 'unavailable'
    }
    if (host === null) {
      return 'unknown'
    }
    // `host.compat` is deliberately not consulted. A blocked verdict means this client refuses to
    // talk to that build at all — 001-pairing surfaces that — and it is reached by treating an
    // absent protocol version as 0. Folding it in here would turn "the host never said" into
    // "the method does not exist", which is the coercion FND-R7 exists to prevent.
    const requirement = byPortMethod.get(portMethod)
    if (requirement === undefined) {
      return 'unknown'
    }
    if (requirement.advertises !== null) {
      if (host.advertised === null) {
        return 'unknown'
      }
      if (!host.advertised.has(requirement.advertises)) {
        return 'unavailable'
      }
    }
    if (requirement.sinceProtocolVersion !== null) {
      if (host.protocolVersion === null) {
        return 'unknown'
      }
      if (host.protocolVersion < requirement.sinceProtocolVersion) {
        return 'unavailable'
      }
    }
    return 'available'
  }

  function noteMethodNotFound(portMethod: string): void {
    refused.add(portMethod)
  }

  return { capabilityOf, observeHost, noteMethodNotFound }
}
