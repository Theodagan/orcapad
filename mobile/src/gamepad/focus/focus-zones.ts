import type { ControllerIntentKind } from '../controller-input/controller-intent'

/**
 * The parts of a screen the controller can be pointed at, in the order `X` walks them (`005`
 * USE-R4). A zone only exists while something mounted has declared it, so a screen with one
 * zone has nothing to switch to.
 */
export const FOCUS_ZONES = ['agent', 'shortcuts', 'header', 'panels'] as const

export type FocusZone = (typeof FOCUS_ZONES)[number]

/**
 * Who answers first, declared rather than inferred from mount order: React runs child effects
 * before parents', so "newest wins" handed focus to exactly the wrong surface.
 */
export const FOCUS_PRIORITY = { screen: 0, surface: 1, card: 2 } as const

/** Mean the same wherever the controller is pointed, so the focused zone does not gate them. */
export const ZONE_AGNOSTIC_INTENTS: ReadonlySet<ControllerIntentKind> = new Set([
  'scroll',
  'cycle-tab',
  'cycle-workspace'
])
