import { useEffect, useRef, type ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useController } from '../controller-provider'
import { colors, radii, spacing, typography } from '../../theme/mobile-theme'
import type { WheelController } from './use-wheel-controller'

/**
 * The wheel, drawn above whatever surface is focused. While it is up it owns every input
 * (`005` USE-R11), touch included: the layer takes the touches and does nothing with them, so a
 * finger cannot reach the screen the wheel is currently steering around. An accidental open is
 * still harmless because the wheel closes the moment the stick returns to centre.
 *
 * Plain state, no worklets. `002` §4 gates Reanimated on "where profiling shows a benefit", and
 * there is no profile yet — CTRL-T8 is the task that produces one. Adding worklets first would
 * be answering a question nobody has asked.
 */

const RADIUS_FEW = 96
/** More than this many segments need a wider dial, or their labels touch. */
const MANY_SEGMENTS = 6
const RADIUS_MANY = 122

export function WheelOverlay({ controller }: { readonly controller: WheelController }): ReactNode {
  const { connected } = useController()
  const { view, cancel } = controller

  const wasConnected = useRef(connected)
  useEffect(() => {
    // The falling edge only. A controller that goes away mid-gesture cancels, rather than
    // leaving a wheel nothing can close (`002` §6) — but "no controller attached" is a resting
    // state, not an event, and cancelling on every render while disconnected would fight
    // anything that opened the wheel by other means.
    const lost = wasConnected.current && !connected
    wasConnected.current = connected
    if (lost) {
      cancel()
    }
  }, [connected, cancel])

  if (view.state.kind === 'closed') {
    return null
  }

  const locked = view.state.locked
  const lockedSegment = view.segments.find((segment) => segment.id === locked) ?? null
  const radius = view.segments.length > MANY_SEGMENTS ? RADIUS_MANY : RADIUS_FEW
  const centre = lockedSegment?.label ?? view.message ?? view.title ?? 'Move the stick'
  const centreDisabled = lockedSegment?.availability === 'unavailable'

  return (
    <View
      accessibilityLabel={view.title === null ? 'Wheel' : `Wheel, ${view.title}`}
      onResponderTerminationRequest={() => false}
      onStartShouldSetResponder={() => true}
      pointerEvents="auto"
      style={styles.backdrop}
    >
      <View style={[styles.dial, { height: radius * 2, width: radius * 2 }]}>
        {view.segments.map((segment) => {
          const isLocked = segment.id === locked
          return (
            <View
              key={segment.id}
              testID={`wheel-segment:${segment.id}`}
              style={[
                styles.segment,
                {
                  transform: [
                    { translateX: Math.sin(segment.centerAngle) * radius },
                    { translateY: -Math.cos(segment.centerAngle) * radius }
                  ]
                },
                isLocked ? styles.segmentLocked : null,
                segment.availability === 'unavailable' ? styles.segmentDisabled : null
              ]}
            >
              <Text numberOfLines={1} style={isLocked ? styles.labelLocked : styles.label}>
                {segment.label}
                {segment.opens === true ? ' ›' : ''}
              </Text>
            </View>
          )
        })}
        <View pointerEvents="none" style={styles.hub} testID="wheel-hub">
          <Text
            numberOfLines={2}
            style={[styles.hubText, centreDisabled ? styles.hubTextDisabled : null]}
          >
            {centre}
          </Text>
          <Text style={styles.hubHint}>{view.state.path.length > 0 ? 'B back' : 'B cancel'}</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: colors.scrim,
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0
  },
  dial: { alignItems: 'center', justifyContent: 'center' },
  segment: {
    alignItems: 'center',
    backgroundColor: colors.bgPanel,
    borderColor: colors.borderSubtle,
    borderRadius: radii.card,
    borderWidth: 1,
    maxWidth: 124,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: 'absolute'
  },
  segmentLocked: {
    backgroundColor: colors.bgRaised,
    borderColor: colors.accentBlue,
    borderWidth: 3
  },
  // Disabled, never hidden: removing it would move every other segment under the thumb.
  segmentDisabled: { opacity: 0.4 },
  label: { color: colors.textSecondary, fontSize: typography.bodySize },
  labelLocked: { color: colors.textPrimary, fontSize: typography.bodySize, fontWeight: '700' },
  hub: { alignItems: 'center', gap: spacing.xs, maxWidth: 112, position: 'absolute' },
  hubText: {
    color: colors.textPrimary,
    fontSize: typography.bodySize,
    fontWeight: '700',
    textAlign: 'center'
  },
  hubTextDisabled: { color: colors.textMuted },
  hubHint: { color: colors.textMuted, fontSize: typography.metaSize }
})
