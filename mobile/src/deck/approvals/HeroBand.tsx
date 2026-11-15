import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { useDeckTheme } from '../theme/deck-theme'

export function HeroBand({ title, detail }: { title: string; detail?: string }): ReactNode {
  const t = useMobileTranslation()
  const theme = useDeckTheme()
  return (
    <View
      style={{ backgroundColor: theme.color.raised, padding: theme.space.sm, gap: theme.space.xs }}
    >
      <Text style={{ color: theme.color.need, fontSize: theme.text.meta }}>
        {t('deck.prompt.needsYou', 'Needs you')}
      </Text>
      <Text style={{ color: theme.color.text1, fontSize: theme.text.title }}>{title}</Text>
      {detail ? (
        <Text style={{ color: theme.color.text2, fontSize: theme.text.body }}>{detail}</Text>
      ) : null}
    </View>
  )
}
