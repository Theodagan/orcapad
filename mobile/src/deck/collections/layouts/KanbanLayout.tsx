import type { ReactNode } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useMobileTranslation } from '../../../i18n/use-mobile-translation'
import { useDeckTheme } from '../../theme/deck-theme'
import type { CollectionItem } from '../collection-model'
import { groupItems } from '../grouping'
import { CollectionCell } from './CollectionCell'

/** SES-0/SES-6: one column per bucket, in the deck's reading order, grouped by the shared grouping. */
export function KanbanLayout({
  items,
  selectedId,
  onSelectItem
}: {
  items: readonly CollectionItem[]
  selectedId: string | null
  onSelectItem: (id: string) => void
}): ReactNode {
  const theme = useDeckTheme()
  const t = useMobileTranslation()
  const columns = groupItems(items, 'status')
  return (
    <ScrollView horizontal contentContainerStyle={{ gap: theme.space.sm, padding: theme.space.sm }}>
      {columns.map((column) => (
        <View key={column.key} style={{ width: theme.space.xl * 7, gap: theme.space.xs }}>
          <Text style={{ color: theme.color.text2, fontSize: theme.text.meta }}>
            {t(`deck.status.${column.key}`, `deck.status.${column.key}`)}
          </Text>
          {column.items.map((item, index) => (
            <CollectionCell
              key={item.id}
              item={item}
              order={index}
              selected={item.id === selectedId}
              onSelect={() => onSelectItem(item.id)}
            />
          ))}
        </View>
      ))}
    </ScrollView>
  )
}
