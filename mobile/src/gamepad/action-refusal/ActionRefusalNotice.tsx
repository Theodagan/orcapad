import { useEffect, useSyncExternalStore, type ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, radii, spacing, typography } from '../../theme/mobile-theme'
import type { ActionRefusalStore } from './action-refusal-store'

const VISIBLE_MS = 1800

/** A short line for a refused button press. Takes no touches and clears itself. */
export function ActionRefusalNotice({ store }: { readonly store: ActionRefusalStore }): ReactNode {
  const refusal = useSyncExternalStore(store.subscribe, store.current)

  useEffect(() => {
    if (refusal === null) {
      return
    }
    const timer = setTimeout(() => store.clear(refusal.seq), VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [refusal, store])

  if (refusal === null) {
    return null
  }
  return (
    <View pointerEvents="none" style={styles.container}>
      <View accessibilityLiveRegion="polite" style={styles.notice}>
        <Text style={styles.text}>{refusal.message}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: spacing.xl
  },
  notice: {
    backgroundColor: colors.bgRaised,
    borderColor: colors.borderSubtle,
    borderRadius: radii.card,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  },
  text: { color: colors.textSecondary, fontSize: typography.metaSize }
})
