import type { ControllerIntentKind } from './controller-intent'
import type { ControllerButton } from './controller-sample'

/**
 * CTRL-R2. Provisional, not contractual: the D-pad's behaviour is a trial, and the PRD makes no
 * promise about it. Kept in its own module so a test over the accepted mapping cannot reach it
 * even by accident, and so disabling the experiment cannot disturb the contract.
 */

export type ExperimentalDpadBinding = {
  readonly button: Extract<ControllerButton, 'dpad-up' | 'dpad-down' | 'dpad-left' | 'dpad-right'>
  readonly intent: Extract<ControllerIntentKind, 'move-selection' | 'move-horizontal'>
  readonly direction: 'up' | 'down' | 'left' | 'right'
  readonly label: string
}

export const EXPERIMENTAL_DPAD_BINDINGS: readonly ExperimentalDpadBinding[] = [
  { button: 'dpad-up', intent: 'move-selection', direction: 'up', label: 'D-pad up' },
  { button: 'dpad-down', intent: 'move-selection', direction: 'down', label: 'D-pad down' },
  { button: 'dpad-left', intent: 'move-horizontal', direction: 'left', label: 'D-pad left' },
  { button: 'dpad-right', intent: 'move-horizontal', direction: 'right', label: 'D-pad right' }
]
