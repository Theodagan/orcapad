import { useEffect, useRef, type ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useController } from '../controller-provider'
import { colors, radii, spacing, typography } from '../../theme/mobile-theme'
import type { WheelController } from './use-wheel-controller'

/**
 * The wheel, drawn above whatever surface is focused. It takes no touches: the surface beneath
 * stays usable throughout, which is what makes an accidental open harmless (WHEEL-R8).
 *
 * Plain state, no worklets. `002` §4 gates Reanimated on "where profiling shows a benefit", and
 * there is no profile yet — CTRL-T8 is the task that produces one. Adding worklets first would
 * be answering a question nobody has asked.
 */

const RADIUS = 96

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

  return (
    <View pointerEvents="none" style={styles.backdrop}>
      <View style={styles.wheel}>
        {view.segments.map((segment) => {
          const isLocked = segment.id === locked
          return (
            <View
              key={segment.id}
              style={[
                styles.segment,
                {
                  transform: [
                    { translateX: Math.sin(segment.centerAngle) * RADIUS },
                    { translateY: -Math.cos(segment.centerAngle) * RADIUS }
                  ]
                },
                isLocked ? styles.segmentLocked : null,
                segment.availability === 'unavailable' ? styles.segmentDisabled : null
              ]}
            >
              <Text style={isLocked ? styles.labelLocked : styles.label}>{segment.label}</Text>
            </View>
          )
        })}
        {view.segments.length === 0 ? <Text style={styles.label}>No actions here</Text> : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0
  },
  wheel: { alignItems: 'center', height: RADIUS * 2, justifyContent: 'center', width: RADIUS * 2 },
  segment: {
    alignItems: 'center',
    backgroundColor: colors.bgPanel,
    borderColor: colors.borderSubtle,
    borderRadius: radii.card,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: 'absolute'
  },
  segmentLocked: { backgroundColor: colors.bgRaised, borderColor: colors.accentBlue },
  // Disabled, never hidden: removing it would move every other segment under the thumb.
  segmentDisabled: { opacity: 0.4 },
  label: { color: colors.textSecondary, fontSize: typography.metaSize },
  labelLocked: { color: colors.textPrimary, fontSize: typography.metaSize }
})
