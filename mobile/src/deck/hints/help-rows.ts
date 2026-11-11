import type { Translate } from '../../i18n/mobile-i18n'
import {
  bindingsForScope,
  chordLabel,
  DECK_CONTROLS,
  type DeckBinding,
  type DeckScreenScope
} from '../controller/chord-table'

export type DeckHelpRow = { readonly control: string; readonly label: string }

/**
 * SD-10: the Help diagram is the active bindings drawn as a controller — one row per control and
 * layer, in the controller's own order, labelled from the table. The Y layer is its own row
 * because Y is a modifier: the same control means two different things.
 */
export function helpRows(
  t: Translate,
  scope: DeckScreenScope,
  bindings: readonly DeckBinding[] = bindingsForScope(scope)
): readonly DeckHelpRow[] {
  return DECK_CONTROLS.flatMap((control) => {
    const forControl = bindings.filter((binding) => binding.chord.control === control)
    return [false, true].flatMap((modified) => {
      const layer = forControl.filter((binding) => (binding.chord.modifier === true) === modified)
      if (layer.length === 0) {
        return []
      }
      const name = `${modified ? 'Y + ' : ''}${control.toUpperCase()}`
      const labels = layer.map((binding) => chordLabel(t, binding)).join(' / ')
      return [{ control: name, label: `${name}: ${labels}` }]
    })
  })
}
