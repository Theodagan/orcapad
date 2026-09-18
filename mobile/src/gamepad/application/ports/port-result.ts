/**
 * The envelope every port method returns. A port never throws for an expected failure —
 * a host that predates a capability, a dropped socket and a reply that would not decode are
 * all outcomes a feature renders, not exceptions it catches. A throw from a port means a
 * violated precondition, which is a programmer error.
 */

export const PORT_FAILURE_KINDS = [
  'disconnected', // no transport
  'unsupported', // host does not implement the capability
  'refused', // host answered with a refusal
  'timeout',
  'invalid-response' // reply did not decode
] as const

export type PortFailureKind = (typeof PORT_FAILURE_KINDS)[number]

export type PortFailure = {
  readonly kind: PortFailureKind
  readonly message: string
  /** True when a retry on reconnect is expected to succeed. */
  readonly retryable: boolean
}

export type PortResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly failure: PortFailure }
