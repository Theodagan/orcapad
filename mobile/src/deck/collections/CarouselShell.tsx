import { useMemo, type ReactNode } from 'react'
import { PanResponder, View } from 'react-native'
import { MobileSegmentedControl } from '../../components/MobileSegmentedControl'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { useControllerFocus } from '../../gamepad/focus/use-controller-focus'
import { FocusableOrca } from '../focus/focusable-orca'
import { useDeckTheme } from '../theme/deck-theme'
import type { CollectionItem, CollectionLayoutKind } from './collection-model'
import { moveCarouselSelection, swipeDirection } from './carousel-selection'

export type CarouselState = {
  readonly items: readonly CollectionItem[]
  readonly selectedId: string | null
  readonly layout: CollectionLayoutKind
}

const LAYOUT_KEYS: Readonly<Record<CollectionLayoutKind, string>> = {
  cards: 'deck.layout.cards',
  kanban: 'deck.layout.kanban',
  list: 'deck.layout.list',
  grid: 'deck.layout.grid'
}

const ALL_LAYOUTS: readonly CollectionLayoutKind[] = ['cards', 'kanban', 'list', 'grid']

/** SD-6: one shell around every collection — the layout tabs on top, the items below. */
export function CarouselShell({
  items,
  selectedId,
  onSelectItem,
  layouts = ALL_LAYOUTS,
  layout,
  onLayoutChange,
  children
}: {
  items: readonly CollectionItem[]
  selectedId: string | null
  onSelectItem: (id: string) => void
  layouts?: readonly CollectionLayoutKind[]
  layout: CollectionLayoutKind
  onLayoutChange: (layout: CollectionLayoutKind) => void
  children: (state: CarouselState) => ReactNode
}): ReactNode {
  const theme = useDeckTheme()
  const t = useMobileTranslation()
  const move = (direction: 'previous' | 'next'): boolean => {
    const next = moveCarouselSelection(items, selectedId, direction)
    if (next === null) {
      return false
    }
    onSelectItem(next)
    return true
  }

  // COL-6: bare L1/R1 are the pad's half of the same move the swipe makes.
  useControllerFocus({
    id: 'carousel',
    zone: 'list',
    accepts: new Set(['cycle-tab']),
    labels: { 'cycle-tab': t('deck.chord.itemNext', 'Next item') },
    handle: (intent) => {
      if (intent.kind !== 'cycle-tab') {
        return
      }
      move(intent.direction)
    }
  })

  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) => swipeDirection(gesture.dx) !== null,
        onPanResponderRelease: (_event, gesture) => {
          const direction = swipeDirection(gesture.dx)
          if (direction === null) {
            return
          }
          const next = moveCarouselSelection(items, selectedId, direction)
          if (next !== null) {
            onSelectItem(next)
          }
        }
      }),
    [items, selectedId, onSelectItem]
  )

  const at = layouts.indexOf(layout)
  const nextLayout = layouts[(at + 1) % layouts.length] ?? layout

  return (
    <View style={{ flex: 1 }} {...swipe.panHandlers}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.space.sm,
          padding: theme.space.sm
        }}
      >
        <FocusableOrca
          zone="list"
          id="carousel-layout"
          order={0}
          onActivate={() => onLayoutChange(nextLayout)}
        >
          <MobileSegmentedControl
            segments={layouts.map((kind) => ({
              value: kind,
              label: t(LAYOUT_KEYS[kind], LAYOUT_KEYS[kind])
            }))}
            selected={layout}
            onSelect={onLayoutChange}
            tabs
          />
        </FocusableOrca>
      </View>
      <View style={{ flex: 1 }}>{children({ items, selectedId, layout })}</View>
    </View>
  )
}
