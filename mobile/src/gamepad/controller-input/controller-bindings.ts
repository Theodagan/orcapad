import type { ControllerIntentKind } from './controller-intent'
import type { ControllerAxis, ControllerButton } from './controller-sample'
import { DO_ACTION_IDS, VIEW_ACTION_IDS } from '../bindings/wheel-action-ids'

/**
 * The accepted PRD mapping (CTRL-R1), as data rather than as branches, so a test can assert the
 * contract row by row and a reader can see the whole scheme at once. `005` moved three rows:
 * `Y` toggles dictation on tap, while `X` is held for directional zone movement. `012` gave Start
 * and Select one wheel action each, run through the wheel registry so both paths stay one. `X` is
 * now the only modifier: X+LB/RB cycle workspaces, X+Y shows or hides the prompt, X+Select stops.
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
        'confirm' | 'back' | 'toggle-dictation' | 'cycle-tab' | 'cycle-workspace' | 'run-action'
      >
      readonly direction: 'previous' | 'next' | null
      /** The wheel registry id a `run-action` row runs. */
      readonly actionId?: string
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
  | { readonly kind: 'modifier'; readonly button: ControllerButton; readonly label: string }
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
    chord: 'x',
    intent: 'cycle-workspace',
    direction: 'previous',
    timing: 'press',
    label: 'X+LB'
  },
  {
    kind: 'button',
    button: 'rb',
    chord: 'x',
    intent: 'cycle-workspace',
    direction: 'next',
    timing: 'press',
    label: 'X+RB'
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
  { kind: 'modifier', button: 'x', label: 'X modifier' },
  {
    kind: 'button',
    button: 'y',
    chord: null,
    intent: 'toggle-dictation',
    direction: null,
    timing: 'tap',
    label: 'Y'
  },
  {
    kind: 'button',
    button: 'y',
    chord: 'x',
    intent: 'run-action',
    direction: null,
    actionId: VIEW_ACTION_IDS.question,
    timing: 'press',
    label: 'X+Y'
  },
  {
    kind: 'button',
    button: 'select',
    chord: 'x',
    intent: 'run-action',
    direction: null,
    actionId: DO_ACTION_IDS.stop,
    timing: 'press',
    label: 'X+Select'
  },
  {
    kind: 'button',
    button: 'select',
    chord: null,
    intent: 'run-action',
    direction: null,
    actionId: VIEW_ACTION_IDS.focusMode,
    timing: 'press',
    label: 'Select'
  },
  { kind: 'unassigned', button: 'start', label: 'Start' },
  { kind: 'unassigned', button: 'r3', label: 'R3' },
  { kind: 'unassigned', button: 'l3', label: 'L3' }
]

/** The one modifier. Held through another button it never fires on its own. */
export const CHORD_BUTTON: ControllerButton = 'x'

/** A tap is a quick press and release; longer than this and `Y` held alone stays inert. */
export const TAP_MAX_MS = 500
