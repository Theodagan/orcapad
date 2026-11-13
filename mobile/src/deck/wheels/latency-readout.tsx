import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { useDeckTheme } from '../theme/deck-theme'

/**
 * DECK-R18 asks for a feel the owner judges on the device. Stick samples reach JavaScript as events
 * from `OrcaGamepadModule.kt` and the wheel's ring is drawn on the UI thread, so the gap between the
 * two is measured here: the sample's arrival stamp against the frame it was drawn in. Nothing here
 * decides anything for the user — it is a readout, and it is off unless the deck's dev setting says
 * otherwise.
 */
export type WheelLatencyMeasurement = {
  /** When the stick sample reached JavaScript (`performance.now()` on the sample's event). */
  readonly sampleAt: number
  /** When the frame that showed it was drawn. */
  readonly frameAt: number
}

/** The rolling window the readout keeps: enough turns to see a tail, few enough to follow a change. */
export const WHEEL_LATENCY_WINDOW = 120

/**
 * Nearest-rank percentiles over an unsorted window, so p50 is the lower middle value on an even
 * count; null when nothing has been measured yet.
 */
export function latencyPercentiles(
  values: readonly number[]
): { readonly p50: number; readonly p95: number } | null {
  if (values.length === 0) {
    return null
  }
  const sorted = [...values].sort((left, right) => left - right)
  const at = (fraction: number): number => {
    const rank = Math.ceil(fraction * sorted.length) - 1
    return sorted[Math.min(Math.max(rank, 0), sorted.length - 1)] ?? 0
  }
  return { p50: at(0.5), p95: at(0.95) }
}

/** Sample-to-draw latencies in milliseconds, oldest first, kept to the rolling window. */
export function sampleToFrameLatencies(
  measurements: readonly WheelLatencyMeasurement[]
): readonly number[] {
  return measurements
    .map((measurement) => measurement.frameAt - measurement.sampleAt)
    .slice(-WHEEL_LATENCY_WINDOW)
}

/** Off by default: the overlay exists for device trials, never for daily use. */
export function showsWheelLatency(devSettingEnabled: boolean): boolean {
  return devSettingEnabled
}

export function WheelLatencyReadout({
  measurements,
  devSettingEnabled = false
}: {
  measurements: readonly WheelLatencyMeasurement[]
  devSettingEnabled?: boolean
}): ReactNode {
  const theme = useDeckTheme()
  const t = useMobileTranslation()
  if (!showsWheelLatency(devSettingEnabled)) {
    return null
  }
  const percentiles = latencyPercentiles(sampleToFrameLatencies(measurements))
  return (
    <View
      style={{
        position: 'absolute',
        right: theme.space.sm,
        bottom: theme.space.sm,
        padding: theme.space.xs,
        borderRadius: theme.radius.control,
        backgroundColor: theme.color.raised,
        gap: theme.space.xs
      }}
    >
      <Text style={{ color: theme.color.text2, fontSize: theme.text.meta }}>
        {t('deck.wheels.latency.title', 'Stick to frame')}
      </Text>
      <Text style={{ color: theme.color.text1, fontSize: theme.text.meta }}>
        {percentiles === null
          ? t('deck.wheels.latency.none', 'No turns measured yet')
          : t('deck.wheels.latency.line', 'p50 {{p50}} ms · p95 {{p95}} ms', {
              p50: Math.round(percentiles.p50),
              p95: Math.round(percentiles.p95)
            })}
      </Text>
    </View>
  )
}
