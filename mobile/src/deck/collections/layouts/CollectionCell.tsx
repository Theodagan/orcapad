import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { AgentStateDot } from '../../../components/AgentStateDot'
import { useMobileTranslation } from '../../../i18n/use-mobile-translation'
import { FocusableOrca } from '../../focus/focusable-orca'
import { useDeckTheme } from '../../theme/deck-theme'
import { DOT_STATE_FOR_STATUS, type CollectionItem } from '../collection-model'

/**
 * One item, drawn the same way in every layout: Orca's own state dot (IH-10), the item's title and
 * the bucket's name. The layouts differ in arrangement, never in what an item says.
 */
export function CollectionCell({
  item,
  order,
  selected,
  onSelect,
  grow = false
}: {
  item: CollectionItem
  order: number
  selected: boolean
  onSelect: () => void
  /** Cards and grid cells share the row; a list row keeps its own width. */
  grow?: boolean
}): ReactNode {
  const theme = useDeckTheme()
  const t = useMobileTranslation()
  return (
    <View style={{ flexGrow: grow ? 1 : 0, flexBasis: grow ? 0 : 'auto' }}>
      <FocusableOrca
        zone="list"
        id={`collection:${item.id}`}
        order={order}
        onActivate={onSelect}
        accessibilityLabel={item.title}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.space.sm,
            padding: theme.space.sm,
            borderRadius: theme.radius.control,
            backgroundColor: selected ? theme.color.raised : theme.color.panel
          }}
        >
          <AgentStateDot state={DOT_STATE_FOR_STATUS[item.status]} />
          <View style={{ flex: 1, gap: theme.space.xs }}>
            <Text style={{ color: theme.color.text1, fontSize: theme.text.body }}>
              {item.title}
            </Text>
            <Text style={{ color: theme.color.text3, fontSize: theme.text.meta }}>
              {t(`deck.status.${item.status}`, `deck.status.${item.status}`)}
            </Text>
          </View>
        </View>
      </FocusableOrca>
    </View>
  )
}
