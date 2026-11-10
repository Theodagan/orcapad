import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import {
  chordLabel,
  modifierBindingsForScope,
  bindingsForScope,
  type DeckScreenScope
} from '../controller/chord-table'
import { useDeckModifierHeld } from '../controller/use-deck-bindings'
import { useDeckTheme } from '../theme/deck-theme'

/** A hint chip's painted width, used to decide how many fit (VIS-6/SD-2: never overflow). */
const CHIP_WIDTH = 96
const STRIP_PADDING = 24

/** How many chips fit the available width; the lowest-priority ones are dropped, not wrapped. */
export function visibleHintCount(bindings: number, width: number): number {
  const room = Math.max(width - STRIP_PADDING, 0)
  return Math.max(Math.min(bindings, Math.floor(room / CHIP_WIDTH)), 0)
}

/**
 * PAD-13/IH-6: the strip reads the chord table for the current screen, and while Y is held it
 * shows the Y layer instead. It drops hints rather than overflow, so the last chip is never cut.
 */
export function DeckHintStrip({
  scope,
  width
}: {
  scope: DeckScreenScope
  width: number
}): ReactNode {
  const t = useMobileTranslation()
  const theme = useDeckTheme()
  const modifierHeld = useDeckModifierHeld()
  const bindings = modifierHeld ? modifierBindingsForScope(scope) : bindingsForScope(scope)
  const shown = bindings.slice(0, visibleHintCount(bindings.length, width))
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: theme.space.sm,
        paddingHorizontal: theme.space.md,
        paddingVertical: theme.space.xs
      }}
    >
      {shown.map((binding) => (
        <View
          key={`${binding.chord.control}-${binding.chord.with ?? ''}-${binding.intent}`}
          style={{
            width: CHIP_WIDTH,
            borderRadius: theme.radius.pill,
            paddingHorizontal: theme.space.sm,
            backgroundColor: theme.color.raised
          }}
        >
          <Text numberOfLines={1} style={{ color: theme.color.text2, fontSize: theme.text.meta }}>
            {`${binding.chord.control.toUpperCase()}  ${chordLabel(t, binding)}`}
          </Text>
        </View>
      ))}
    </View>
  )
}
