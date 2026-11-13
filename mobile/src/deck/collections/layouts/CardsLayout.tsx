import type { ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import { useDeckTheme } from '../../theme/deck-theme'
import type { CollectionItem } from '../collection-model'
import { CollectionCell } from './CollectionCell'

/** SES-0: cards, side by side, scrolled as one row so a thumb can flick through the agents. */
export function CardsLayout({
  items,
  selectedId,
  onSelectItem
}: {
  items: readonly CollectionItem[]
  selectedId: string | null
  onSelectItem: (id: string) => void
}): ReactNode {
  const theme = useDeckTheme()
  return (
    <ScrollView horizontal contentContainerStyle={{ gap: theme.space.sm, padding: theme.space.sm }}>
      {items.map((item, index) => (
        <View key={item.id} style={{ width: theme.space.xl * 6 }}>
          <CollectionCell
            item={item}
            order={index}
            selected={item.id === selectedId}
            onSelect={() => onSelectItem(item.id)}
          />
        </View>
      ))}
    </ScrollView>
  )
}
