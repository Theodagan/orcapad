import type { ControllerIntentKind } from './controller-intent'
import type { ControllerButton } from './controller-sample'

/**
 * List movement. Contract as of `004` LOOP-R2, where CTRL-R2's experiment ended.
 *
 * The PRD treated the D-pad as provisional because the wheel was assumed to carry navigation. A
 * wheel has segments and a host list has rows, and the two do not substitute — with this off, a
 * controller-only user cannot open any host but the first. That is not an experiment failing; it
 * is the product not working, which is what `004` LOOP-T1's audit surfaced.
 *
 * Still its own module, and still a separate data set from `PRD_CONTROLLER_BINDINGS`. They have
 * different provenance — one is the PRD's own table, this one was promoted by a recorded
 * decision — and the ratchet keeps a test from conflating them.
 *
 * The decision is under `docs/decisions/controller-contract/`.
 */

export type DpadNavigationBinding = {
  readonly button: Extract<ControllerButton, 'dpad-up' | 'dpad-down' | 'dpad-left' | 'dpad-right'>
  readonly intent: Extract<ControllerIntentKind, 'move-selection' | 'move-horizontal'>
  readonly direction: 'up' | 'down' | 'left' | 'right'
  readonly label: string
}

export const DPAD_NAVIGATION_BINDINGS: readonly DpadNavigationBinding[] = [
  { button: 'dpad-up', intent: 'move-selection', direction: 'up', label: 'D-pad up' },
  { button: 'dpad-down', intent: 'move-selection', direction: 'down', label: 'D-pad down' },
  { button: 'dpad-left', intent: 'move-horizontal', direction: 'left', label: 'D-pad left' },
  { button: 'dpad-right', intent: 'move-horizontal', direction: 'right', label: 'D-pad right' }
]
