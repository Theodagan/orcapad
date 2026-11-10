import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import type { Translate } from '../../i18n/mobile-i18n'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import {
  bindingsForScope,
  chordLabel,
  type DeckBinding,
  type DeckScreenScope
} from '../controller/chord-table'
import { useDeckTheme } from '../theme/deck-theme'

/** SD-10: the Help diagram is a drawing of the controller, labelled from the live table. */
export const DECK_HELP_CONTROLS = ['a', 'b', 'start', 'l1', 'r1', 'l2', 'r2', 'l3', 'r3'] as const

export type DeckHelpRow = { readonly control: string; readonly label: string }

/** One row per control the table binds on this screen, in controller order. */
export function helpRows(
  t: Translate,
  scope: DeckScreenScope,
  bindings: readonly DeckBinding[] = bindingsForScope(scope)
): readonly DeckHelpRow[] {
  return DECK_HELP_CONTROLS.flatMap((control) => {
    const label = labelFor(control, t, bindings)
    return label === null ? [] : [{ control, label }]
  })
}

function labelFor(control: string, t: Translate, bindings: readonly DeckBinding[]): string | null {
  const match = bindings.find((binding) => binding.chord.control === control)
  if (match === undefined) {
    return null
  }
  const modifier = match.chord.with === 'y' ? 'Y + ' : ''
  return `${modifier}${control.toUpperCase()}: ${chordLabel(t, match)}`
}

export function DeckHelp({ scope }: { scope: DeckScreenScope }): ReactNode {
  const t = useMobileTranslation()
  const theme = useDeckTheme()
  return (
    <View style={{ padding: theme.space.lg, gap: theme.space.xs }}>
      <Text style={{ color: theme.color.text1, fontSize: theme.text.pageTitle }}>
        {t('deck.help.title', 'Controls')}
      </Text>
      {helpRows(t, scope).map((row) => (
        <Text key={row.control} style={{ color: theme.color.text2, fontSize: theme.text.body }}>
          {row.label}
        </Text>
      ))}
    </View>
  )
}
