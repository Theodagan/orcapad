import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import type { DeckScreenScope } from '../controller/chord-table'
import { useDeckTheme } from '../theme/deck-theme'
import { helpRows } from './help-rows'

/** SD-10: the controller drawing, labelled from the live chord table for the current screen. */
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
