import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useActiveDictation, useControllerBinding, useFocusSnapshot } from './controller-provider'
import { isDictationActive } from './bindings/active-dictation'
import { actionHintsFor, type ActionHint } from './controller-input/action-hints'
import type { FocusZone } from './focus/focus-zones'
import { colors, radii, spacing, typography } from '../theme/mobile-theme'

/**
 * What the buttons do on whatever has focus. The pad has no labels on it, and a controller-first
 * product that makes you guess is one where you press `B` to find out what `B` does.
 *
 * Only while a controller is attached — a touch user has no use for it, and BIND-AC10 means the
 * screen must look exactly as it did before. It sits in the layout under the screens rather than
 * over them, so it never covers the composer or the shortcut keys it is describing, and it takes
 * no touches, so it can never be the reason something stopped working.
 */

const ZONE_NAME: Record<FocusZone, string> = {
  agent: 'Agent',
  shortcuts: 'Shortcuts',
  header: 'Header',
  panels: 'Panel'
}

/** What `A` and `B` do to an open wheel, which is all that does anything while one is up. */
const WHEEL_HINTS: readonly ActionHint[] = [
  { control: 'A', label: 'Select' },
  { control: 'B', label: 'Cancel' }
]

export function ActionHintBar({ wheelOpen = false }: { readonly wheelOpen?: boolean }): ReactNode {
  const { connected } = useControllerBinding()
  const { reachable, labels, focusedZone, zones, nextZone } = useFocusSnapshot()
  const dictation = useActiveDictation()
  const insets = useSafeAreaInsets()

  // Dictation is the session's, not a surface's: offered whenever it could start (words have
  // somewhere to land) or must be able to stop (the microphone is live).
  const live = dictation !== null && isDictationActive(dictation.activity)
  const canDictate = dictation !== null && (live || dictation.canStart)
  const offered = canDictate ? new Set([...reachable, 'toggle-dictation' as const]) : reachable
  // `X` names where it goes, which says both what it does and where you are headed.
  const wording = {
    ...labels,
    ...(nextZone === null ? {} : { 'switch-zone': ZONE_NAME[nextZone] }),
    ...(live ? { 'toggle-dictation': 'Stop dictation' } : {})
  }
  const hints = wheelOpen ? WHEEL_HINTS : actionHintsFor(offered, wording)
  if (!connected || hints.length === 0) {
    return null
  }
  const chip = wheelOpen
    ? 'Wheel'
    : focusedZone !== null && zones.length > 1
      ? ZONE_NAME[focusedZone]
      : null

  return (
    <View
      accessibilityLabel={chip === null ? 'Controller actions' : `Controller actions, ${chip}`}
      pointerEvents="none"
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.xs) }]}
    >
      {chip === null ? null : (
        <View style={styles.zoneChip}>
          <Text style={styles.zoneText}>{chip}</Text>
        </View>
      )}
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
    backgroundColor: colors.bgPanel,
    borderTopColor: colors.borderSubtle,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs
  },
  hint: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  control: {
    backgroundColor: colors.bgRaised,
    borderRadius: radii.card,
    color: colors.textPrimary,
    fontSize: typography.metaSize,
    fontWeight: '600',
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2
  },
  label: { color: colors.textSecondary, fontSize: typography.metaSize },
  zoneChip: {
    backgroundColor: colors.accentBlue,
    borderRadius: radii.card,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2
  },
  zoneText: {
    color: colors.onAccent,
    fontSize: typography.metaSize,
    fontWeight: '700',
    textTransform: 'uppercase'
  }
})
