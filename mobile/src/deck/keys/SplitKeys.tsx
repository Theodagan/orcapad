import { useState, type ReactNode } from 'react'
import { Text, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { ReservedRect } from '../../../modules/orca-reserved-regions/src'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { FocusableOrca } from '../focus/focusable-orca'
import { useDeckTheme } from '../theme/deck-theme'
import {
  deleteBeforeSplitCursor,
  insertAtSplitCursor,
  splitKeysPlacement
} from './split-keys-layout'

const LEFT_KEYS = ['q', 'w', 'e', 'r', 't', 'a', 's', 'd', 'f', 'g', 'z', 'x', 'c', 'v']
const RIGHT_KEYS = ['y', 'u', 'i', 'o', 'p', 'h', 'j', 'k', 'l', 'b', 'n', 'm']
const NO_OCCLUSIONS: readonly ReservedRect[] = []

export function SplitKeys({
  value,
  onChangeText,
  occlusions = NO_OCCLUSIONS,
  keyboardHeight = 0
}: {
  value: string
  onChangeText: (text: string) => void
  occlusions?: readonly ReservedRect[]
  keyboardHeight?: number
}): ReactNode {
  const t = useMobileTranslation()
  const theme = useDeckTheme()
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const placement = splitKeysPlacement({
    windowWidth: width,
    windowHeight: height,
    insets,
    occlusions,
    keyboardHeight
  })
  const [cursors, setCursors] = useState({ left: value.length, right: value.length })
  const apply = (side: 'left' | 'right', insertion: string | null): void => {
    const current = cursors[side] > value.length ? value.length : cursors[side]
    const next =
      insertion === null
        ? deleteBeforeSplitCursor(value, current)
        : insertAtSplitCursor(value, current, insertion)
    onChangeText(next.text)
    setCursors((previous) => ({ ...previous, [side]: next.cursor }))
  }
  const half = (side: 'left' | 'right', keys: readonly string[]): ReactNode => (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: theme.space.xs,
        width: placement.orientation === 'landscape' ? '48%' : '100%',
        paddingTop: placement.strip?.side === side ? placement.strip.top : 0
      }}
    >
      {keys.map((key, index) => (
        <FocusableOrca
          key={key}
          zone="list"
          id={`split-key:${side}:${key}`}
          order={index}
          onActivate={() => apply(side, key)}
          accessibilityLabel={key}
        >
          <Text
            style={{ color: theme.color.text1, fontSize: theme.text.body, padding: theme.space.sm }}
          >
            {key}
          </Text>
        </FocusableOrca>
      ))}
      <FocusableOrca
        zone="list"
        id={`split-key:${side}:backspace`}
        order={keys.length}
        onActivate={() => apply(side, null)}
        accessibilityLabel={t('deck.keys.backspace', 'Backspace')}
      >
        <Text style={{ color: theme.color.text2, padding: theme.space.sm }}>⌫</Text>
      </FocusableOrca>
      <FocusableOrca
        zone="list"
        id={`split-key:${side}:space`}
        order={keys.length + 1}
        onActivate={() => apply(side, ' ')}
        accessibilityLabel={t('deck.keys.space', 'Space')}
      >
        <Text style={{ color: theme.color.text2, padding: theme.space.sm }}>␣</Text>
      </FocusableOrca>
    </View>
  )
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', backgroundColor: theme.color.panel }}>
      {half('left', LEFT_KEYS)}
      {half('right', RIGHT_KEYS)}
    </View>
  )
}
