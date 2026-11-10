import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { useDeckTheme } from '../theme/deck-theme'

/**
 * HINT-2/HINT-6: a focused element shows the button that presses it. HINT-8: when the element is
 * too small to hold the glyph without breaking its layout, the glyph is left to the strip instead —
 * better no hint there than a squeezed row.
 */
export function hintGlyphFits(elementWidth: number, elementHeight: number): boolean {
  return elementWidth >= 96 && elementHeight >= 32
}

export function Hintify({
  glyph,
  focused,
  width,
  height,
  children
}: {
  glyph: string
  focused: boolean
  width: number
  height: number
  children: ReactNode
}): ReactNode {
  const theme = useDeckTheme()
  const inline = focused && hintGlyphFits(width, height)
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.sm }}>
      {children}
      {inline ? (
        <View
          style={{
            borderRadius: theme.radius.pill,
            paddingHorizontal: theme.space.xs,
            backgroundColor: theme.color.raised
          }}
        >
          <Text style={{ color: theme.color.text1, fontSize: theme.text.meta }}>{glyph}</Text>
        </View>
      ) : null}
    </View>
  )
}
