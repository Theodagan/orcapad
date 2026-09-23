import type { ControllerIntentKind } from './controller-intent'
import type { ControllerAxis, ControllerButton } from './controller-sample'

/**
 * The accepted PRD mapping (CTRL-R1), as data rather than as branches, so a test can assert the
 * contract row by row and a reader can see the whole scheme at once.
 *
 * The provisional D-pad set lives in its own module and must never be merged into this one: the
 * boundary test fails a module that declares both, because a contract and an experiment sharing
 * a table is how an experiment quietly becomes a promise.
 */

export type ControllerBinding =
  | {
      readonly kind: 'button'
      readonly button: ControllerButton
      /** Held modifier. Null means the binding only fires when no modifier is held. */
      readonly chord: ControllerButton | null
      readonly intent: Extract<
        ControllerIntentKind,
        'confirm' | 'back' | 'stop' | 'toggle-dictation' | 'cycle-tab' | 'cycle-workspace'
      >
      readonly direction: 'previous' | 'next' | null
      readonly label: string
    }
  | {
      readonly kind: 'trigger'
      readonly axis: Extract<ControllerAxis, 'l2' | 'r2'>
      readonly intent: Extract<ControllerIntentKind, 'scroll'>
      readonly direction: 'up' | 'down'
      readonly label: string
    }
  | {
      readonly kind: 'stick'
      readonly axes: readonly [ControllerAxis, ControllerAxis]
      readonly intent: Extract<ControllerIntentKind, 'wheel-motion'>
      readonly wheel: 1 | 2
      readonly label: string
    }
  /** Named so the contract states what stays free, and a test can prove it stays inert. */
  | { readonly kind: 'unassigned'; readonly button: ControllerButton; readonly label: string }

export const PRD_CONTROLLER_BINDINGS: readonly ControllerBinding[] = [
  { kind: 'trigger', axis: 'l2', intent: 'scroll', direction: 'up', label: 'L2' },
  { kind: 'trigger', axis: 'r2', intent: 'scroll', direction: 'down', label: 'R2' },
  {
    kind: 'button',
    button: 'lb',
    chord: null,
    intent: 'cycle-tab',
    direction: 'previous',
    label: 'LB'
  },
  {
    kind: 'button',
    button: 'rb',
    chord: null,
    intent: 'cycle-tab',
    direction: 'next',
    label: 'RB'
  },
  {
    kind: 'button',
    button: 'lb',
    chord: 'y',
    intent: 'cycle-workspace',
    direction: 'previous',
    label: 'Y+LB'
  },
  {
    kind: 'button',
    button: 'rb',
    chord: 'y',
    intent: 'cycle-workspace',
    direction: 'next',
    label: 'Y+RB'
  },
  {
    kind: 'stick',
    axes: ['left-x', 'left-y'],
    intent: 'wheel-motion',
    wheel: 1,
    label: 'Left stick'
  },
  {
    kind: 'stick',
    axes: ['right-x', 'right-y'],
    intent: 'wheel-motion',
    wheel: 2,
    label: 'Right stick'
  },
  { kind: 'button', button: 'a', chord: null, intent: 'confirm', direction: null, label: 'A' },
  { kind: 'button', button: 'b', chord: null, intent: 'back', direction: null, label: 'B' },
  { kind: 'button', button: 'x', chord: null, intent: 'stop', direction: null, label: 'X' },
  {
    kind: 'button',
    button: 'r3',
    chord: null,
    intent: 'toggle-dictation',
    direction: null,
    label: 'R3'
  },
  { kind: 'unassigned', button: 'l3', label: 'L3' }
]

/** The one modifier the PRD defines. Held alone it does nothing (CTRL-R4). */
export const CHORD_BUTTON: ControllerButton = 'y'
