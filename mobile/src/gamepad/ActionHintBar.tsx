import { useMemo, useSyncExternalStore, type ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useActiveDictation, useControllerBinding, useFocusSnapshot } from './controller-provider'
import { isDictationActive } from './bindings/active-dictation'
import { actionHintsFor, RUN_ACTION_IDS } from './controller-input/action-hints'
import { isRunnableAction, type WheelRegistry } from './wheel/wheel-registry'
import { useSessionChrome } from './session-chrome/use-session-chrome'
import type { FocusZone } from './focus/focus-zones'
import { useWheelOpen, type WheelViewSource } from './wheel/wheel-view-store'
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
  list: 'List',
  agent: 'Agent',
  shortcuts: 'Shortcuts',
  header: 'Header',
  panels: 'Panel'
}

export type WheelActionSource = Pick<WheelRegistry, 'lookup' | 'subscribe'>

const noSubscribe = (): (() => void) => () => {}

/** The button-run actions that can run now; re-renders only when that set changes. */
function useRunnableActions(actions: WheelActionSource | undefined): ReadonlySet<string> {
  const key = useSyncExternalStore(actions?.subscribe ?? noSubscribe, () =>
    actions === undefined
      ? ''
      : RUN_ACTION_IDS.filter((id) => isRunnableAction(actions.lookup(id))).join('\n')
  )
  return useMemo(() => new Set(key === '' ? [] : key.split('\n')), [key])
}

export function ActionHintBar({
  wheel,
  actions
}: {
  readonly wheel?: WheelViewSource
  readonly actions?: WheelActionSource
}): ReactNode {
  const wheelOpen = useWheelOpen(wheel)
  const runnable = useRunnableActions(actions)
  const { connected } = useControllerBinding()
  const { focusMode } = useSessionChrome()
  const { reachable, labels, focusedZone, zones } = useFocusSnapshot()
  const dictation = useActiveDictation()
  const insets = useSafeAreaInsets()

  // Dictation is the session's, not a surface's: offered whenever it could start (words have
  // somewhere to land) or must be able to stop (the microphone is live).
  const live = dictation !== null && isDictationActive(dictation.activity)
  const canDictate = dictation !== null && (live || dictation.canStart)
  const offered = canDictate ? new Set([...reachable, 'toggle-dictation' as const]) : reachable
  const wording = {
    ...labels,
    'switch-zone': 'Zones',
    ...(live
      ? {
          'toggle-dictation':
            dictation.activity === 'recording' ? 'Stop dictation' : 'Cancel dictation'
        }
      : {})
  }
  // An open wheel names its own triggers in its corners; saying it twice here would drift.
  const hints = wheelOpen ? [] : actionHintsFor(offered, wording, runnable)
  if (!connected || focusMode || (hints.length === 0 && !wheelOpen)) {
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
