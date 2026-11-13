import type { ReactNode } from 'react'
import { ScrollView } from 'react-native'
import { useDeckTheme } from '../../theme/deck-theme'
import type { CollectionItem } from '../collection-model'
import { CollectionCell } from './CollectionCell'

/** SES-0: one row per item, in the host's order — the layout that reads fastest when scanning. */
export function ListLayout({
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
    <ScrollView contentContainerStyle={{ gap: theme.space.xs, padding: theme.space.sm }}>
      {items.map((item, index) => (
        <CollectionCell
          key={item.id}
          item={item}
          order={index}
          selected={item.id === selectedId}
          onSelect={() => onSelectItem(item.id)}
        />
      ))}
    </ScrollView>
  )
}
