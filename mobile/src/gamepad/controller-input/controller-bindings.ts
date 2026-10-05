import type { ControllerIntentKind } from './controller-intent'
import type { ControllerAxis, ControllerButton } from './controller-sample'

/**
 * The accepted PRD mapping (CTRL-R1), as data rather than as branches, so a test can assert the
 * contract row by row and a reader can see the whole scheme at once. `005` moved three rows:
 * `X` became the zone switch, dictation moved from `R3` to a tap of `Y`, and `R3` was freed.
 *
 * The D-pad set lives in its own module and must never be merged into this one: the boundary
 * test fails a module that declares both, because the two have different provenance and a
 * contract and a promoted experiment sharing a table is how the difference gets lost.
 */

export type ControllerBinding =
  | {
      readonly kind: 'button'
      readonly button: ControllerButton
      /** Held modifier. Null means the binding only fires when no modifier is held. */
      readonly chord: ControllerButton | null
      readonly intent: Extract<
        ControllerIntentKind,
        'confirm' | 'back' | 'switch-zone' | 'toggle-dictation' | 'cycle-tab' | 'cycle-workspace'
      >
      readonly direction: 'previous' | 'next' | null
      /**
       * `press` fires on the way down. `tap` fires on release, and only when the button went down
       * and up alone: a button that doubles as a modifier cannot know what it is until then.
       */
      readonly timing: 'press' | 'tap'
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

export type ButtonBinding = Extract<ControllerBinding, { readonly kind: 'button' }>

export const PRD_CONTROLLER_BINDINGS: readonly ControllerBinding[] = [
  { kind: 'trigger', axis: 'l2', intent: 'scroll', direction: 'up', label: 'L2' },
  { kind: 'trigger', axis: 'r2', intent: 'scroll', direction: 'down', label: 'R2' },
  {
    kind: 'button',
    button: 'lb',
    chord: null,
    intent: 'cycle-tab',
    direction: 'previous',
    timing: 'press',
    label: 'LB'
  },
  {
    kind: 'button',
    button: 'rb',
    chord: null,
    intent: 'cycle-tab',
    direction: 'next',
    timing: 'press',
    label: 'RB'
  },
  {
    kind: 'button',
    button: 'lb',
    chord: 'y',
    intent: 'cycle-workspace',
    direction: 'previous',
    timing: 'press',
    label: 'Y+LB'
  },
  {
    kind: 'button',
    button: 'rb',
    chord: 'y',
    intent: 'cycle-workspace',
    direction: 'next',
    timing: 'press',
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
  {
    kind: 'button',
    button: 'a',
    chord: null,
    intent: 'confirm',
    direction: null,
    timing: 'press',
    label: 'A'
  },
  {
    kind: 'button',
    button: 'b',
    chord: null,
    intent: 'back',
    direction: null,
    timing: 'press',
    label: 'B'
  },
  {
    kind: 'button',
    button: 'x',
    chord: null,
    intent: 'switch-zone',
    direction: null,
    timing: 'press',
    label: 'X'
  },
  {
    kind: 'button',
    button: 'y',
    chord: null,
    intent: 'toggle-dictation',
    direction: null,
    timing: 'tap',
    label: 'Y'
  },
  { kind: 'unassigned', button: 'r3', label: 'R3' },
  { kind: 'unassigned', button: 'l3', label: 'L3' }
]

/** The one modifier the PRD defines. Held through another button it never fires on its own. */
export const CHORD_BUTTON: ControllerButton = 'y'

/** A tap is a quick press and release; longer than this and `Y` held alone stays inert. */
export const TAP_MAX_MS = 500
