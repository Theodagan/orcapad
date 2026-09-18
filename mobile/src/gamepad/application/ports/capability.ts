/**
 * Whether a host answers a given port method. `unknown` is its own state and never collapses
 * into `unavailable`: an absent field on a host's status reply means "this host predates the
 * field", which is not the same as the host saying no. A feature renders `unknown` as an
 * affordance it has not yet proved, not as one it has ruled out.
 */

export const CAPABILITIES = ['available', 'unavailable', 'unknown'] as const

export type Capability = (typeof CAPABILITIES)[number]
