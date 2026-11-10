import type { Translate } from '../../i18n/mobile-i18n'
import {
  bindingsForScope,
  chordLabel,
  DECK_CONTROLS,
  type DeckBinding,
  type DeckScreenScope
} from '../controller/chord-table'

export type DeckHelpRow = { readonly control: string; readonly label: string }

/** SD-10: one row per control the table binds on this screen, in the controller's own order. */
export function helpRows(
  t: Translate,
  scope: DeckScreenScope,
  bindings: readonly DeckBinding[] = bindingsForScope(scope)
): readonly DeckHelpRow[] {
  return DECK_CONTROLS.flatMap((control) => {
    const match = bindings.find((binding) => binding.chord.control === control)
    if (match === undefined) {
      return []
    }
    const modifier = match.chord.with === 'y' ? 'Y + ' : ''
    return [{ control, label: `${modifier}${control.toUpperCase()}: ${chordLabel(t, match)}` }]
  })
}
