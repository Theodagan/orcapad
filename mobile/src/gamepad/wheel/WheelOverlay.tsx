import { useEffect, useRef, type ReactNode } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import { WHEEL_TRIGGER_NAMES } from '../controller-input/wheel-trigger-steering'
import { colors, radii, spacing, typography } from '../../theme/mobile-theme'
import type { WheelController } from './use-wheel-controller'
import type { WheelSegment } from './wheel-segment'
import { useWheelView } from './wheel-view-store'

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
const RADIUS_MANY = 140
/** Past this a label ellipsizes, so neighbours on a full dial never overlap. */
const LABEL_MAX_WIDTH = 96
/** How far past the parent ring a menu's half circle sits. */
const MENU_RING_GAP = 120
/** A half circle is as tall as it is wide twice over; squashed, it fits a landscape screen. */
const MENU_RING_SQUASH = 0.72
/** How far the whole wheel slides away from the side its menu opens on, as a share of that ring. */
const MENU_SHIFT = 0.45
const SHIFT_MS = 180

function ringRadius(count: number): number {
  return count > MANY_SEGMENTS ? RADIUS_MANY : RADIUS_FEW
}

/** Inside a menu the wheel moves sideways, so the half circle has the room its side needs. */
function useMenuShift(offset: number): Animated.Value {
  const shift = useRef(new Animated.Value(offset)).current
  useEffect(() => {
    Animated.timing(shift, { toValue: offset, duration: SHIFT_MS, useNativeDriver: true }).start()
  }, [shift, offset])
  return shift
}

// A pad lost mid-gesture is cancelled by `useCancelWheelOnDisconnect`, not here.
export function WheelOverlay({
  controller
}: {
  readonly controller: Pick<WheelController, 'view'>
}): ReactNode {
  const view = useWheelView(controller.view)
  const parent = view.state.kind === 'open' ? (view.parent ?? null) : null
  // In a menu the parent keeps its own ring and the menu takes a half circle outside it.
  const innerRadius = ringRadius((parent?.segments ?? view.segments).length)
  const outerRadius = innerRadius + MENU_RING_GAP
  const side = parent?.side ?? 'right'
  const shift = useMenuShift(
    parent === null ? 0 : (side === 'right' ? -1 : 1) * outerRadius * MENU_SHIFT
  )

  if (view.state.kind === 'closed') {
    return null
  }

  const locked = view.state.locked
  const lockedSegment = view.segments.find((segment) => segment.id === locked) ?? null
  const canSelect = lockedSegment !== null && lockedSegment.availability !== 'unavailable'
  const selectWord = lockedSegment?.opens === true ? 'Open' : 'Select'
  const size = (parent === null ? innerRadius : outerRadius) * 2

  return (
    <View
      accessibilityLabel={view.title === null ? 'Wheel' : `Wheel, ${view.title}`}
      onResponderTerminationRequest={() => false}
      onStartShouldSetResponder={() => true}
      pointerEvents="auto"
      style={styles.backdrop}
    >
      {view.title === null ? null : <Text style={styles.title}>{view.title}</Text>}
      <Animated.View
        style={[styles.dial, { height: size, width: size, transform: [{ translateX: shift }] }]}
      >
        {parent === null
          ? view.segments.map((segment) => (
              <SegmentChip
                key={segment.id}
                segment={segment}
                x={Math.sin(segment.centerAngle) * innerRadius}
                y={-Math.cos(segment.centerAngle) * innerRadius}
                tone={segment.id === locked ? 'locked' : 'idle'}
              />
            ))
          : [
              ...parent.segments.map((segment) => (
                <SegmentChip
                  key={`parent:${segment.id}`}
                  segment={segment}
                  x={Math.sin(segment.centerAngle) * innerRadius}
                  y={-Math.cos(segment.centerAngle) * innerRadius}
                  tone={segment.bindingId === parent.openedBindingId ? 'opened' : 'behind'}
                />
              )),
              ...view.segments.map((segment) => (
                <SegmentChip
                  key={segment.id}
                  segment={segment}
                  x={Math.sin(segment.centerAngle) * outerRadius}
                  y={-Math.cos(segment.centerAngle) * outerRadius * MENU_RING_SQUASH}
                  tone={segment.id === locked ? 'locked' : 'idle'}
                />
              ))
            ]}
        {/* Loading, empty or failed with no segments; with segments, why the lit one is refused. */}
        {view.message !== null ? <Text style={styles.message}>{view.message}</Text> : null}
      </Animated.View>
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

/** `behind` is the parent ring under an open menu; `opened` is the slot that opened it. */
type ChipTone = 'idle' | 'locked' | 'behind' | 'opened'

function SegmentChip({
  segment,
  x,
  y,
  tone
}: {
  readonly segment: WheelSegment
  readonly x: number
  readonly y: number
  readonly tone: ChipTone
}): ReactNode {
  return (
    <View
      testID={`wheel-segment:${tone === 'behind' || tone === 'opened' ? 'parent:' : ''}${segment.id}`}
      style={[
        styles.segment,
        { transform: [{ translateX: x }, { translateY: y }] },
        tone === 'locked' ? styles.segmentLocked : null,
        tone === 'opened' ? styles.segmentOpened : null,
        tone === 'behind' ? styles.segmentBehind : null,
        segment.availability === 'unavailable' && tone !== 'behind' ? styles.segmentDisabled : null
      ]}
    >
      <Text numberOfLines={1} style={tone === 'locked' ? styles.labelLocked : styles.label}>
        {segment.label}
        {segment.opens === true ? ' ›' : ''}
      </Text>
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
  segmentOpened: { borderColor: colors.accentBlue, borderWidth: 2 },
  segmentBehind: { opacity: 0.35 },
  label: { color: colors.textSecondary, fontSize: typography.bodySize, maxWidth: LABEL_MAX_WIDTH },
  labelLocked: {
    color: colors.textPrimary,
    fontSize: typography.bodySize,
    fontWeight: '700',
    maxWidth: LABEL_MAX_WIDTH
  },
  message: {
    color: colors.textMuted,
    fontSize: typography.bodySize,
    maxWidth: LABEL_MAX_WIDTH,
    textAlign: 'center'
  },
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
