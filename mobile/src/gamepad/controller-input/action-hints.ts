import {
  CHORD_BUTTON,
  PRD_CONTROLLER_BINDINGS,
  type ControllerBinding
} from './controller-bindings'
import type { ControllerIntentKind, IntentLabels } from './controller-intent'
import type { ControllerAxis, ControllerButton } from './controller-sample'
import { DO_ACTION_IDS, VIEW_ACTION_IDS } from '../bindings/wheel-action-ids'

/**
 * What the buttons do right now, derived from the surface that has focus.
 *
 * A controller-first product where you cannot see what a button does is not first class — the
 * pad has no labels on it, and a user who has to guess is a user who presses `B` to find out.
 *
 * Derived, never authored. The control-to-intent mapping is `PRD_CONTROLLER_BINDINGS`, which
 * already exists and is already the contract; a second hand-written hint table would drift from
 * it the first time a binding changed, and the drift would be invisible — the hints would simply
 * be wrong, which is worse than absent. What a surface contributes is its own wording for an
 * intent ("Enter" where another says "Select"), and nothing else.
 *
 * Raw control names appear here, which is why this module lives under `controller-input/`:
 * CTRL-T7's ratchet keeps them out of everywhere else.
 */

export type ActionHint = {
  /** The control as it is printed on the pad. */
  readonly control: string
  readonly label: string
}

/** The shoulders are printed L1/R1 on the handhelds this is built for, not LB/RB. */
const PRINTED_NAME: Partial<Record<ControllerButton | ControllerAxis, string>> = {
  lb: 'L1',
  rb: 'R1',
  l2: 'L2',
  r2: 'R2',
  l3: 'L3',
  r3: 'R3',
  start: 'Start',
  select: 'Select'
}

/** Used when a surface offers no wording of its own. Never a control name. */
const DEFAULT_WORDS: Record<ControllerIntentKind, string> = {
  scroll: 'Scroll',
  'cycle-tab': 'Tabs',
  'cycle-workspace': 'Worktrees',
  'wheel-motion': 'Wheel',
  'switch-zone': 'Zone',
  confirm: 'Select',
  back: 'Back',
  'toggle-dictation': 'Dictate',
  'move-selection': 'Move',
  'move-horizontal': 'Move',
  'jump-message': 'My messages',
  'run-action': 'Action'
}

/** What a `run-action` button does, in the bar's words. */
const RUN_ACTION_WORDS: Readonly<Record<string, string>> = {
  [DO_ACTION_IDS.stop]: 'Stop',
  [VIEW_ACTION_IDS.focusMode]: 'Focus',
  [VIEW_ACTION_IDS.question]: 'Prompt'
}

type RunActionRow = Extract<ControllerBinding, { kind: 'button' }> & { readonly actionId: string }

const RUN_ACTION_ROWS: readonly RunActionRow[] = PRD_CONTROLLER_BINDINGS.filter(
  (binding): binding is RunActionRow =>
    binding.kind === 'button' && binding.intent === 'run-action' && binding.actionId !== undefined
)

/** Named whenever the screen has them, running or not, and with or without X held. */
const PINNED_ACTION_IDS: ReadonlySet<string> = new Set([DO_ACTION_IDS.stop])

/** The action ids a button runs, so the hint bar knows which registrations to watch. */
export const RUN_ACTION_IDS: readonly string[] = RUN_ACTION_ROWS.map((row) => row.actionId)

/** The order the bar reads in: what you do most, first. It does not reshuffle as surfaces change. */
const HINT_ORDER: readonly ControllerIntentKind[] = [
  'confirm',
  'back',
  'move-selection',
  'move-horizontal',
  'switch-zone',
  'toggle-dictation',
  'scroll',
  'jump-message',
  'cycle-tab',
  'cycle-workspace'
]

function printed(name: ControllerButton | ControllerAxis): string {
  return PRINTED_NAME[name] ?? name.toUpperCase()
}

/** `L1/R1`, `X+L1/R1`: the controls a cycling or scrolling pair is spread over, said once. */
function controlsFor(intent: ControllerIntentKind): { control: string; chorded: boolean } | null {
  const rows = PRD_CONTROLLER_BINDINGS.filter(
    (
      binding
    ): binding is Extract<ControllerBinding, { kind: 'button' | 'trigger' | 'chord-trigger' }> =>
      (binding.kind === 'button' ||
        binding.kind === 'trigger' ||
        binding.kind === 'chord-trigger') &&
      binding.intent === intent
  )
  if (rows.length === 0) {
    return null
  }
  const names = rows.map((row) => (row.kind === 'button' ? printed(row.button) : printed(row.axis)))
  const first = rows[0]
  const chord = first === undefined || first.kind === 'trigger' ? null : first.chord
  const prefix = chord === null ? '' : `${printed(chord)}+`
  return { control: `${prefix}${names.join('/')}`, chorded: chord !== null }
}

function dpadControl(horizontal: boolean, vertical: boolean): string {
  if (horizontal && vertical) {
    return 'D-pad'
  }
  return vertical ? 'D-pad ↑↓' : 'D-pad ←→'
}

type ChordedHint = ActionHint & { readonly chorded: boolean; readonly pinned?: boolean }

/**
 * One hint per control the focused surface actually answers for. Both D-pad axes with the same
 * wording read as one hint, because "arrows" is one thing to a user and four buttons to a table.
 * At rest the modifier's combos fold into one `X` hint; held, they are all the bar shows. A pinned
 * action (Stop) shows in both, whenever the screen has it.
 */
export function actionHintsFor(
  accepts: ReadonlySet<ControllerIntentKind>,
  labels: IntentLabels = {},
  /** Action ids the registry can run now; a button's hint shows only while its action can. */
  runnable: ReadonlySet<string> = new Set(),
  modifierHeld = false,
  /** Action ids registered here at all, runnable or not; what a pinned hint needs. */
  registered: ReadonlySet<string> = runnable
): readonly ActionHint[] {
  const hints: ChordedHint[] = []
  const wording = (intent: ControllerIntentKind): string => labels[intent] ?? DEFAULT_WORDS[intent]
  const vertical = accepts.has('move-selection')
  const horizontal = accepts.has('move-horizontal')
  const dpadMerged =
    vertical && horizontal && wording('move-selection') === wording('move-horizontal')

  for (const intent of HINT_ORDER) {
    if (!accepts.has(intent)) {
      continue
    }
    if (intent === 'move-selection' || intent === 'move-horizontal') {
      if (dpadMerged && intent === 'move-horizontal') {
        continue
      }
      const merged = dpadMerged && intent === 'move-selection'
      hints.push({
        control: merged
          ? 'D-pad'
          : dpadControl(intent === 'move-horizontal', intent === 'move-selection'),
        label: wording(intent),
        chorded: false
      })
      continue
    }
    if (intent === 'switch-zone') {
      hints.push({
        control: `${printed(CHORD_BUTTON)}+D-pad`,
        label: wording(intent),
        chorded: true
      })
      continue
    }
    const controls = controlsFor(intent)
    if (controls !== null) {
      hints.push({
        control: controls.control,
        label: wording(intent),
        chorded: controls.chorded
      })
    }
  }
  for (const row of RUN_ACTION_ROWS) {
    const pinned = PINNED_ACTION_IDS.has(row.actionId)
    if (pinned ? registered.has(row.actionId) : runnable.has(row.actionId)) {
      const { chord } = row
      hints.push({
        control: chord === null ? printed(row.button) : `${printed(chord)}+${printed(row.button)}`,
        label: RUN_ACTION_WORDS[row.actionId] ?? DEFAULT_WORDS['run-action'],
        chorded: chord !== null,
        pinned
      })
    }
  }
  const shown = hints.filter((hint) => hint.pinned === true || hint.chorded === modifierHeld)
  if (!modifierHeld && hints.some((hint) => hint.pinned !== true && hint.chorded)) {
    shown.push({
      control: printed(CHORD_BUTTON),
      label: 'More',
      chorded: false
    })
  }
  return shown.map(({ control, label }) => ({ control, label }))
}
