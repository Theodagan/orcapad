import { structuredAgentSessionHostSupport } from '../../session/mobile-structured-agent-session-host-support'
import { supportsMobileQuickCommands } from '../../terminal/quick-commands'
import { MOBILE_AI_VAULT_CAPABILITY } from '../../agent-history/agent-history-capability'
import type { DisabledReason } from './disabled-reason'

/**
 * DECK-R41: a deck feature is available because the desktop *declared* it, never because the deck's
 * engine code happens to know how to do it. An older desktop, or a newer fork build against one,
 * lands in the same place: the control is shown disabled with its reason.
 *
 * Pure, so the rule can be tested without a connection; the hook that reads a host is next door.
 */
export type DeckHostFeature = 'agent-history' | 'quick-commands' | 'structured-agent-session'

export type HostFeatureAvailability =
  | { readonly available: true }
  | { readonly available: false; readonly reason: DisabledReason }

/** The declared capability strings each deck feature needs, read through Orca's own predicates. */
const FEATURE_SUPPORT: Record<DeckHostFeature, (capabilities: readonly string[]) => boolean> = {
  'agent-history': (capabilities) => capabilities.includes(MOBILE_AI_VAULT_CAPABILITY),
  'quick-commands': (capabilities) => supportsMobileQuickCommands(capabilities),
  'structured-agent-session': (capabilities) =>
    structuredAgentSessionHostSupport(capabilities).promptCancel
}

export function resolveHostFeature(args: {
  readonly feature: DeckHostFeature
  readonly capabilities: readonly string[] | undefined
  readonly connected: boolean
  readonly statusReadable: boolean
}): HostFeatureAvailability {
  // Not connected and never answered are different sentences for the user, so they stay apart.
  if (!args.connected) {
    return { available: false, reason: 'not-connected' }
  }
  if (!args.statusReadable) {
    return { available: false, reason: 'unknown-host' }
  }
  return FEATURE_SUPPORT[args.feature](args.capabilities ?? [])
    ? { available: true }
    : { available: false, reason: 'not-declared' }
}
