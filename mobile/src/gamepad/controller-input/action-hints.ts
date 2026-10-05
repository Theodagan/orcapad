import { PRD_CONTROLLER_BINDINGS, type ControllerBinding } from './controller-bindings'
import type { ControllerIntentKind, IntentLabels } from './controller-intent'
import type { ControllerAxis, ControllerButton } from './controller-sample'

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
  r3: 'R3'
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
  'move-horizontal': 'Move'
}

/** The order the bar reads in: what you do most, first. It does not reshuffle as surfaces change. */
const HINT_ORDER: readonly ControllerIntentKind[] = [
  'confirm',
  'back',
  'move-selection',
  'move-horizontal',
  'switch-zone',
  'toggle-dictation',
  'scroll',
  'cycle-tab',
  'cycle-workspace'
]

function printed(name: ControllerButton | ControllerAxis): string {
  return PRINTED_NAME[name] ?? name.toUpperCase()
}

/** `L1/R1`, `Y+L1/R1`: the controls a cycling or scrolling pair is spread over, said once. */
function controlsFor(intent: ControllerIntentKind): string | null {
  const rows = PRD_CONTROLLER_BINDINGS.filter(
    (binding): binding is Exclude<ControllerBinding, { kind: 'stick' | 'unassigned' }> =>
      binding.kind !== 'stick' && binding.kind !== 'unassigned' && binding.intent === intent
  )
  if (rows.length === 0) {
    return null
  }
  const names = rows.map((row) => (row.kind === 'button' ? printed(row.button) : printed(row.axis)))
  const first = rows[0]
  const prefix = first?.kind === 'button' && first.chord !== null ? `${printed(first.chord)}+` : ''
  return `${prefix}${names.join('/')}`
}

function dpadControl(horizontal: boolean, vertical: boolean): string {
  if (horizontal && vertical) {
    return 'D-pad'
  }
  return vertical ? 'D-pad ↑↓' : 'D-pad ←→'
}

/**
 * One hint per control the focused surface actually answers for. Both D-pad axes with the same
 * wording read as one hint, because "arrows" is one thing to a user and four buttons to a table.
 */
export function actionHintsFor(
  accepts: ReadonlySet<ControllerIntentKind>,
  labels: IntentLabels = {}
): readonly ActionHint[] {
  const hints: ActionHint[] = []
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
        label: wording(intent)
      })
      continue
    }
    const control = controlsFor(intent)
    if (control !== null) {
      hints.push({ control, label: wording(intent) })
    }
  }
  return hints
}
