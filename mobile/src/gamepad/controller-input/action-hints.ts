import { PRD_CONTROLLER_BINDINGS } from './controller-bindings'
import type { ControllerIntentKind } from './controller-intent'

/**
 * What the buttons do right now, derived from the surface that has focus.
 *
 * A controller-first product where you cannot see what a button does is not first class — the
 * pad has no labels on it, and a user who has to guess is a user who presses `B` to find out.
 *
 * Derived, never authored. The control-to-intent mapping is `PRD_CONTROLLER_BINDINGS`, which
 * already exists and is already the contract; a second hand-written hint table would drift from
 * it the first time a binding changed, and the drift would be invisible — the hints would simply
 * be wrong, which is worse than absent.
 *
 * Raw control names appear here, which is why this module lives under `controller-input/`:
 * CTRL-T7's ratchet keeps them out of everywhere else.
 */

export type ActionHint = {
  /** The control as a user would name it, for a glyph or a short label. */
  readonly control: string
  readonly label: string
}

/** How a surface names what an intent does there. Falls back to the PRD's own wording. */
export type IntentLabels = Partial<Record<ControllerIntentKind, string>>

/** Contract controls the D-pad carries, which the PRD table does not list (`004` LOOP-R2). */
const NAVIGATION_HINTS: readonly {
  readonly intent: ControllerIntentKind
  readonly control: string
}[] = [
  { intent: 'move-selection', control: 'D-pad ↑↓' },
  { intent: 'move-horizontal', control: 'D-pad ←→' }
]

function controlNameOf(binding: (typeof PRD_CONTROLLER_BINDINGS)[number]): string | null {
  if (binding.kind === 'button') {
    const name = binding.button.toUpperCase()
    return binding.chord === null ? name : `${binding.chord.toUpperCase()}+${name}`
  }
  if (binding.kind === 'trigger') {
    return binding.axis.toUpperCase()
  }
  return null
}

/**
 * One hint per control the focused surface actually answers for. Order follows the PRD table so
 * the bar does not reshuffle as a surface's capabilities change — a hint that moves while you
 * are reading it is worse than one that is missing.
 */
export function actionHintsFor(
  accepts: ReadonlySet<ControllerIntentKind>,
  labels: IntentLabels = {}
): readonly ActionHint[] {
  const hints: ActionHint[] = []
  const seen = new Set<string>()

  for (const binding of PRD_CONTROLLER_BINDINGS) {
    if (binding.kind === 'unassigned' || !accepts.has(binding.intent)) {
      continue
    }
    const control = controlNameOf(binding)
    if (control === null || seen.has(control)) {
      continue
    }
    seen.add(control)
    hints.push({ control, label: labels[binding.intent] ?? binding.label })
  }

  for (const navigation of NAVIGATION_HINTS) {
    if (accepts.has(navigation.intent) && !seen.has(navigation.control)) {
      seen.add(navigation.control)
      hints.push({
        control: navigation.control,
        label: labels[navigation.intent] ?? 'Move'
      })
    }
  }

  return hints
}
