import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { colors, radii } from '../../theme/mobile-theme'

/**
 * What the controller's cursor looks like, defined once (`005` USE-R5): a thick blue ring with a
 * thin light line inside it, over a faint wash, so it reads on dark and on blue alike. Drawn inside
 * the element it marks, so it moves nothing and cannot be clipped by a parent. Render it only
 * while the element is focused and a pad is attached.
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
