import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { colors, radii } from '../../theme/mobile-theme'

/**
 * What the controller's cursor looks like, defined once (`005` USE-R5). A thick blue ring with a
 * thin light line inside it, over a faint wash: the blue reads on a dark screen, the light line
 * keeps it readable on a blue one, and neither depends on a thumb being near enough to see a
 * hairline. It is drawn inside the element it marks, over everything else in it, so it moves
 * nothing and can never be clipped by a parent.
 *
 * Render it only while the element is focused and a pad is attached; a touch user sees no ring.
 */
export function ControllerFocusRing({
  radius = radii.row
}: {
  readonly radius?: number
}): ReactNode {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[styles.ring, { borderRadius: radius }]}
      testID="controller-focus-ring"
    >
      <View style={[styles.inner, { borderRadius: Math.max(radius - 2, 0) }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  ring: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.accentBlueTint,
    borderColor: colors.accentBlue,
    borderWidth: 3
  },
  inner: {
    ...StyleSheet.absoluteFillObject,
    borderColor: colors.onAccent,
    borderWidth: 1,
    opacity: 0.9
  }
})
