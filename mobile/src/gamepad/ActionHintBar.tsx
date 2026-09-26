import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useControllerBinding } from './controller-provider'
import { actionHintsFor } from './controller-input/action-hints'
import { colors, radii, spacing, typography } from '../theme/mobile-theme'

/**
 * What the buttons do on whatever has focus. The pad has no labels on it, and a controller-first
 * product that makes you guess is one where you press `B` to find out what `B` does.
 *
 * Only while a controller is attached — a touch user has no use for it, and BIND-AC10 means the
 * screen must look exactly as it did before. It takes no touches either, so it can never be the
 * reason something underneath it stopped working.
 */
export function ActionHintBar(): ReactNode {
  const { connected, activeAccepts } = useControllerBinding()
  const hints = actionHintsFor(activeAccepts)

  if (!connected || hints.length === 0) {
    return null
  }

  return (
    <View pointerEvents="none" style={styles.bar}>
      {hints.map((hint) => (
        <View key={hint.control} style={styles.hint}>
          <Text style={styles.control}>{hint.control}</Text>
          <Text style={styles.label} numberOfLines={1}>
            {hint.label}
          </Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    bottom: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    left: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: 'absolute',
    right: 0
  },
  hint: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  control: {
    backgroundColor: colors.bgRaised,
    borderRadius: radii.card,
    color: colors.textPrimary,
    fontSize: typography.metaSize,
    fontWeight: '600',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2
  },
  label: { color: colors.textSecondary, fontSize: typography.metaSize }
})
