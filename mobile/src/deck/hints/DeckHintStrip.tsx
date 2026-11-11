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
import { CHIP_WIDTH, visibleHintCount } from './hint-strip-width'

export { visibleHintCount } from './hint-strip-width'

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
          key={`${binding.chord.control}-${binding.chord.modifier === true ? 'y' : ''}-${binding.chord.direction ?? ''}-${binding.intent}`}
          style={{
            width: CHIP_WIDTH,
            borderRadius: theme.radius.pill,
            paddingHorizontal: theme.space.sm,
            backgroundColor: theme.color.raised
          }}
        >
          <Text numberOfLines={1} style={{ color: theme.color.text2, fontSize: theme.text.meta }}>
            {`${binding.chord.modifier === true ? 'Y+' : ''}${binding.chord.control.toUpperCase()}  ${chordLabel(t, binding)}`}
          </Text>
        </View>
      ))}
    </View>
  )
}
