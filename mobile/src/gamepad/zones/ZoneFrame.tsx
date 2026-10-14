import { useSyncExternalStore, type ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { useControllerBinding } from '../controller-provider'
import type { FocusZone } from '../focus/focus-zones'
import { colors, radii } from '../../theme/mobile-theme'

/**
 * The border that says which zone the pad is pointed at (`005` USE-R4). One accent for every zone,
 * slightly highlighted rather than shouting: the item inside carries the loud ring, and the zone's
 * name is in the hint bar. Put it as the last child of the zone's own container; it is absolutely
 * placed, so it moves nothing, and it shows only when a pad is attached and there is more than one
 * zone to tell apart.
 */
export function ZoneFrame({ zone }: { readonly zone: FocusZone }): ReactNode {
  const { connected, focus } = useControllerBinding()
  // A boolean, so a frame re-renders only when it appears or goes, not on every registration.
  const framed = useSyncExternalStore(
    focus.subscribe,
    () => {
      const { focusedZone, zones } = focus.snapshot()
      return zones.length >= 2 && focusedZone === zone
    },
    () => false
  )

  if (!connected || !framed) {
    return null
  }
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.frame}
      testID={`zone-frame:${zone}`}
    />
  )
}

const styles = StyleSheet.create({
  frame: {
    ...StyleSheet.absoluteFillObject,
    borderColor: colors.accentBlue,
    borderRadius: radii.row,
    borderWidth: 2
  }
})
