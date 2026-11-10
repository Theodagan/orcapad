import type { Translate } from '../../i18n/mobile-i18n'
import type { DeckHostFeature } from './host-feature'

/** Why a control is not offered. A code, so the wording stays with the translation catalogs. */
export type DisabledReason = 'not-connected' | 'unknown-host' | 'not-declared' | 'unsupported-host'

const REASON_KEYS: Record<DisabledReason, readonly [string, string]> = {
  'not-connected': ['deck.reason.notConnected', 'This desktop is not connected.'],
  'unknown-host': ['deck.reason.unknownHost', 'This desktop has not said what it supports yet.'],
  'not-declared': ['deck.reason.notDeclared', 'This desktop does not provide it.'],
  'unsupported-host': ['deck.reason.unsupportedHost', 'This desktop is too old for it.']
}

const FEATURE_KEYS: Record<DeckHostFeature, readonly [string, string]> = {
  'agent-history': ['deck.feature.agentHistory', 'Agent history'],
  'quick-commands': ['deck.feature.quickCommands', 'Quick commands'],
  'structured-agent-session': ['deck.feature.agentSession', 'Agent sessions']
}

/** "Agent history — This desktop does not provide it.": the feature, then the reason. */
export function disabledReasonText(
  t: Translate,
  reason: DisabledReason,
  feature?: DeckHostFeature
): string {
  const [reasonKey, reasonFallback] = REASON_KEYS[reason]
  const sentence = t(reasonKey, reasonFallback)
  if (feature === undefined) {
    return sentence
  }
  const [featureKey, featureFallback] = FEATURE_KEYS[feature]
  return `${t(featureKey, featureFallback)} — ${sentence}`
}
