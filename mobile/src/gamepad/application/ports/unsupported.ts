import type { PortResult } from './port-result'

/**
 * The answer a port gives for a capability the runtime does not implement — a host that
 * predates the method, or the stub adapter, which implements none of them. Not retryable:
 * reconnecting to the same host changes nothing, so a feature hides or disables the
 * affordance rather than offering a retry (tech.md §6).
 *
 * `capability` names the port method, not the RPC method. An Orca method name reaching this
 * message would be the adapter leaking vocabulary into a string a feature can render.
 */
export function unsupported<T>(capability: string): PortResult<T> {
  return {
    ok: false,
    failure: {
      kind: 'unsupported',
      message: `This runtime does not implement ${capability}.`,
      retryable: false
    }
  }
}
