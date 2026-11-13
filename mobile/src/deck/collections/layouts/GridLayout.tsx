import type { ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import { useDeckTheme } from '../../theme/deck-theme'
import type { CollectionItem } from '../collection-model'
import { CollectionCell } from './CollectionCell'

/** SES-0: the same cells as cards, wrapped two to a row so more of the deck fits on screen. */
export function GridLayout({
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
    <ScrollView contentContainerStyle={{ padding: theme.space.sm }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm }}>
        {items.map((item, index) => (
          <CollectionCell
            key={item.id}
            item={item}
            order={index}
            grow
            selected={item.id === selectedId}
            onSelect={() => onSelectItem(item.id)}
          />
        ))}
      </View>
    </ScrollView>
  )
}
