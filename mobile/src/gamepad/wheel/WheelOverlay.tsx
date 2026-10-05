import { useEffect, useRef, type ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { WHEEL_TRIGGER_NAMES } from '../controller-input/wheel-trigger-steering'
import { useController } from '../controller-provider'
import { colors, radii, spacing, typography } from '../../theme/mobile-theme'
import type { WheelController } from './use-wheel-controller'

/**
 * The wheel, drawn above whatever surface is focused. While it is up it owns every input
 * (`005` USE-R11), touch included: the layer takes the touches and does nothing with them, so a
 * finger cannot reach the screen the wheel is currently steering around. An accidental open is
 * still harmless because the wheel closes the moment the stick returns to centre.
 *
 * The highlight says what is chosen, so the middle of the dial is empty. The two triggers that
 * answer it are named on the edge of the screen each one sits under, the way a swipe deck names
 * its two sides: `L2` to back out on the left, `R2` to take what is lit on the right.
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
  const canSelect = lockedSegment !== null && lockedSegment.availability !== 'unavailable'
  const selectWord = lockedSegment?.opens === true ? 'Open' : 'Select'

  return (
    <View
      accessibilityLabel={view.title === null ? 'Wheel' : `Wheel, ${view.title}`}
      onResponderTerminationRequest={() => false}
      onStartShouldSetResponder={() => true}
      pointerEvents="auto"
      style={styles.backdrop}
    >
      {view.title === null ? null : <Text style={styles.title}>{view.title}</Text>}
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
        {view.segments.length === 0 && view.message !== null ? (
          <Text style={styles.message}>{view.message}</Text>
        ) : null}
      </View>
      <TriggerCue
        control={WHEEL_TRIGGER_NAMES.back}
        label={view.state.path.length > 0 ? 'Back' : 'Cancel'}
        side="left"
        tone={colors.statusRed}
      />
      <TriggerCue
        control={WHEEL_TRIGGER_NAMES.select}
        dimmed={!canSelect}
        label={selectWord}
        side="right"
        tone={colors.statusGreen}
      />
    </View>
  )
}

/** One trigger and what it does, pinned to the bottom corner on its own side of the screen. */
function TriggerCue({
  control,
  label,
  side,
  tone,
  dimmed = false
}: {
  readonly control: string
  readonly label: string
  readonly side: 'left' | 'right'
  readonly tone: string
  readonly dimmed?: boolean
}): ReactNode {
  return (
    <View
      pointerEvents="none"
      testID={`wheel-cue:${side}`}
      style={[
        styles.cue,
        side === 'left' ? styles.cueLeft : styles.cueRight,
        { borderColor: tone },
        dimmed ? styles.cueDimmed : null
      ]}
    >
      <Text style={[styles.cueControl, { backgroundColor: tone }]}>{control}</Text>
      <Text style={[styles.cueLabel, { color: tone }]}>{label}</Text>
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
  message: { color: colors.textMuted, fontSize: typography.bodySize, textAlign: 'center' },
  title: {
    color: colors.textSecondary,
    fontSize: typography.bodySize,
    fontWeight: '700',
    position: 'absolute',
    top: spacing.xl
  },
  cue: {
    alignItems: 'center',
    backgroundColor: colors.bgPanel,
    borderRadius: radii.card,
    borderWidth: 3,
    bottom: spacing.xl,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: 'absolute'
  },
  cueLeft: { left: spacing.lg },
  cueRight: { right: spacing.lg },
  // Dimmed, never hidden, for the same reason a disabled segment is: the layout must not move.
  cueDimmed: { opacity: 0.4 },
  cueControl: {
    borderRadius: radii.card,
    color: colors.onAccent,
    fontSize: typography.bodySize,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2
  },
  cueLabel: { fontSize: typography.bodySize, fontWeight: '800', textTransform: 'uppercase' }
})
