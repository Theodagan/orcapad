import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { useMobileTranslation } from '../../../i18n/use-mobile-translation'
import { FocusableOrca } from '../../focus/focusable-orca'
import { useDeckTheme } from '../../theme/deck-theme'

/** What the deck has open, in the order it was opened: a workspace or a session, by id. */
export type DeckOpenItem = {
  readonly id: string
  /** The catalog key; the English lives in the catalogs. */
  readonly titleKey: string
  readonly route: string
}

/**
 * PANEL-1: the second left panel is what is already open. An empty list says so and says how it
 * fills rather than showing a blank column (DECK-R38); the caller supplies the items, so the panel
 * never invents one.
 */
export function AllOpen({
  items,
  currentId,
  onOpen
}: {
  items: readonly DeckOpenItem[]
  currentId: string | null
  onOpen: (item: DeckOpenItem) => void
}): ReactNode {
  const theme = useDeckTheme()
  const t = useMobileTranslation()
  if (items.length === 0) {
    return (
      <Text style={{ color: theme.color.text3, fontSize: theme.text.meta }}>
        {t('deck.panel.allOpen.empty', 'deck.panel.allOpen.empty')}
      </Text>
    )
  }
  return (
    <View style={{ gap: theme.space.xs }}>
      {items.map((item, index) => (
        <FocusableOrca
          key={item.id}
          zone="panels"
          id={`all-open:${item.id}`}
          order={index}
          onActivate={() => onOpen(item)}
        >
          <Text
            style={{
              color: item.id === currentId ? theme.color.text1 : theme.color.text2,
              fontSize: theme.text.body,
              paddingVertical: theme.space.xs
            }}
          >
            {t(item.titleKey, item.titleKey)}
          </Text>
        </FocusableOrca>
      ))}
    </View>
  )
}
