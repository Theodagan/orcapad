import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useActiveDictation } from '../gamepad/controller-provider'
import { colors, radii, spacing, typography } from '../theme/mobile-theme'

const LABELS = {
  starting: 'Starting microphone',
  recording: 'Recording',
  processing: 'Processing'
} as const

export function MobileDictationStatusPill(): ReactNode {
  const dictation = useActiveDictation()
  const insets = useSafeAreaInsets()
  if (dictation === null || (dictation.activity === 'idle' && !dictation.notice)) {
    return null
  }

  const active = dictation.activity !== 'idle'
  const label = active ? LABELS[dictation.activity] : dictation.notice
  const action =
    dictation.activity === 'recording'
      ? dictation.stop
      : active
        ? dictation.cancel
        : dictation.onNoticeAction
  const actionLabel = !active ? 'Set up' : dictation.activity === 'recording' ? 'Stop' : 'Cancel'
  return (
    <View pointerEvents="box-none" style={[styles.overlay, { top: insets.top + spacing.xs }]}>
      <View
        accessibilityRole="summary"
        accessibilityLabel={`Dictation: ${label}`}
        style={styles.pill}
      >
        <Text style={styles.label} numberOfLines={2}>
          {label}
        </Text>
        {action ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${actionLabel} dictation`}
            onPress={action}
            style={styles.action}
          >
            <Text style={styles.actionLabel}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', left: 0, right: 0, zIndex: 100, alignItems: 'center' },
  pill: {
    maxWidth: '90%',
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bgRaised,
    borderRadius: radii.card,
    borderColor: colors.borderSubtle,
    borderWidth: 1
  },
  label: { color: colors.textPrimary, fontSize: typography.metaSize, flexShrink: 1 },
  action: { paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
  actionLabel: { color: colors.textPrimary, fontSize: typography.metaSize, fontWeight: '600' }
})
