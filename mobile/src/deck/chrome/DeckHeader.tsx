import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { MobileSegmentedControl } from '../../components/MobileSegmentedControl'
import type { DeckContext } from '../context/deck-context'
import { FocusableOrca } from '../focus/focusable-orca'
import { useDeckTheme } from '../theme/deck-theme'
import {
  crumbLabelKey,
  deckBreadcrumbs,
  type DeckCrumb,
  type DeckCrumbNames
} from './deck-breadcrumbs'

export type DeckHeaderItem = {
  readonly id: string
  /** The catalog key; the English lives in the catalogs. */
  readonly titleKey: string
}

export type DeckSessionView = 'chat' | 'tui'

const NO_ITEMS: readonly DeckHeaderItem[] = []

const VIEW_SEGMENTS = [
  { value: 'chat', labelKey: 'deck.view.chat' },
  { value: 'tui', labelKey: 'deck.view.tui' }
] as const

/**
 * NAV-13/IH-4/SD-5: one header row — breadcrumb, the item tabs when a window holds several items,
 * and the Chat UI / TUI switch on a session screen (SES-1). Every control here is a `FocusableOrca`,
 * so pad selection and a tap reach the same callback (DECK-R13, DECK-R50).
 */
export function DeckHeader({
  context,
  names,
  items = NO_ITEMS,
  selectedItemId = null,
  onSelectItem,
  onCrumbPress,
  view,
  onViewChange
}: {
  context: DeckContext
  names: DeckCrumbNames
  items?: readonly DeckHeaderItem[]
  selectedItemId?: string | null
  onSelectItem?: (id: string) => void
  onCrumbPress?: (crumb: DeckCrumb) => void
  view?: DeckSessionView
  onViewChange?: (view: DeckSessionView) => void
}): ReactNode {
  const theme = useDeckTheme()
  const t = useMobileTranslation()
  const crumbs = deckBreadcrumbs(context, names)
  const showsItems = items.length > 1 && onSelectItem !== undefined
  const showsView = context.screen === 'session' && view !== undefined && onViewChange !== undefined
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space.sm,
        paddingHorizontal: theme.space.md,
        paddingVertical: theme.space.xs,
        borderBottomWidth: 1,
        borderBottomColor: theme.color.hair,
        backgroundColor: theme.color.panel
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.xs }}>
        {crumbs.map((crumb, index) => (
          <FocusableOrca
            key={`${crumb.kind}:${crumb.id}`}
            zone="header"
            id={`crumb:${crumb.kind}:${crumb.id}`}
            order={index}
            onActivate={() => onCrumbPress?.(crumb)}
          >
            <Text
              style={{
                color: index === crumbs.length - 1 ? theme.color.text1 : theme.color.text2,
                fontSize: theme.text.title
              }}
            >
              {crumb.name ?? t(crumbLabelKey(crumb), crumbLabelKey(crumb))}
            </Text>
          </FocusableOrca>
        ))}
      </View>
      {showsItems ? (
        <View style={{ flexDirection: 'row', gap: theme.space.xs }}>
          {items.map((item, index) => (
            <FocusableOrca
              key={item.id}
              zone="header"
              id={`item:${item.id}`}
              order={index}
              onActivate={() => onSelectItem?.(item.id)}
            >
              <Text
                style={{
                  color: item.id === selectedItemId ? theme.color.text1 : theme.color.text3,
                  fontSize: theme.text.body
                }}
              >
                {t(item.titleKey, item.titleKey)}
              </Text>
            </FocusableOrca>
          ))}
        </View>
      ) : null}
      {showsView ? (
        <FocusableOrca
          zone="header"
          id="session-view"
          order={items.length}
          onActivate={() => onViewChange(view === 'chat' ? 'tui' : 'chat')}
        >
          <MobileSegmentedControl
            segments={VIEW_SEGMENTS.map((segment) => ({
              value: segment.value,
              label: t(segment.labelKey, segment.labelKey)
            }))}
            selected={view}
            onSelect={onViewChange}
            tabs
          />
        </FocusableOrca>
      ) : null}
    </View>
  )
}
