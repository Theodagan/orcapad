import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { gamepadProbe } from '../../modules/orca-gamepad-probe'
import { colors, radii, spacing, typography } from '../theme/mobile-theme'
import { controllerProbeRecorder, scrubRecording } from './controller-probe-recorder'

/**
 * CTRL-T1's operator console. The tap it starts is app-wide, so the WebView question is
 * answered by starting here, opening a terminal session, working the pad, and coming back:
 * every event carries the class that held focus when it arrived.
 */

const MOTION_INTERVAL_MS = 16
const VISIBLE_EVENTS = 40

export function ControllerProbeScreen(): React.ReactElement {
  const recording = useSyncExternalStore(
    controllerProbeRecorder.subscribe,
    controllerProbeRecorder.snapshot
  )
  const [running, setRunning] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (gamepadProbe === null || !running) {
      return
    }
    const input = gamepadProbe.addListener('onInputEvent', controllerProbeRecorder.record)
    const devices = gamepadProbe.addListener(
      'onDeviceChange',
      controllerProbeRecorder.recordDeviceChange
    )
    return () => {
      input.remove()
      devices.remove()
    }
  }, [running])

  const start = useCallback(() => {
    if (gamepadProbe === null) {
      return
    }
    controllerProbeRecorder.reset(Date.now())
    controllerProbeRecorder.setDevices(gamepadProbe.listDevices())
    gamepadProbe.start(MOTION_INTERVAL_MS)
    setRunning(true)
  }, [])

  const stop = useCallback(() => {
    gamepadProbe?.stop()
    setRunning(false)
  }, [])

  const copy = useCallback(() => {
    void Clipboard.setStringAsync(
      JSON.stringify(scrubRecording(controllerProbeRecorder.snapshot()), null, 2)
    ).then(() => {
      setCopied(true)
    })
  }, [])

  if (gamepadProbe === null) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Controller probe</Text>
        <Text style={styles.note}>
          The native probe is Android-only and needs a development build. Expo Go cannot load it.
        </Text>
      </View>
    )
  }

  const visible = recording.events.slice(-VISIBLE_EVENTS).toReversed()

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Controller probe</Text>
      <View style={styles.actions}>
        <Pressable onPress={running ? stop : start} style={styles.button}>
          <Text style={styles.buttonText}>{running ? 'Stop' : 'Start'}</Text>
        </Pressable>
        <Pressable onPress={copy} style={styles.button}>
          <Text style={styles.buttonText}>{copied ? 'Copied' : 'Copy scrubbed JSON'}</Text>
        </Pressable>
      </View>

      <Text style={styles.meta}>
        {recording.events.length} events · {recording.droppedEvents} dropped ·{' '}
        {recording.deviceChanges.length} device changes
      </Text>

      <ScrollView style={styles.list}>
        {recording.devices.map((device) => (
          <View key={device.id} style={styles.row}>
            <Text style={styles.rowTitle}>
              {device.name} {device.isGameController ? '(controller)' : ''}
            </Text>
            <Text style={styles.rowBody}>
              vendor {device.vendorId} · product {device.productId} · triggers {device.triggerForm}
            </Text>
            <Text style={styles.rowBody}>
              sources {device.sourceNames.join(', ')} · axes{' '}
              {device.motionRanges.map((range) => range.axisName).join(', ') || 'none'}
            </Text>
          </View>
        ))}

        {visible.map((event) => (
          <View key={event.seq} style={styles.row}>
            <Text style={styles.rowTitle}>
              {event.kind === 'key'
                ? `${event.keyCodeName} ${event.action} (code ${event.keyCode}, scan ${event.scanCode})`
                : `motion ${event.action}`}
            </Text>
            <Text style={styles.rowBody}>
              focus {event.focusedView} · consumed {String(event.consumedByViewTree)}
            </Text>
            {event.kind === 'motion' ? (
              <Text style={styles.rowBody}>
                {Object.entries(event.axes)
                  .filter(([, value]) => Math.abs(value) > 0.05)
                  .map(([axis, value]) => `${axis} ${value.toFixed(2)}`)
                  .join(' · ') || 'all centered'}
              </Text>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bgBase, flex: 1, padding: spacing.lg },
  title: { color: colors.textPrimary, fontSize: typography.titleSize, marginBottom: spacing.md },
  note: { color: colors.textSecondary, fontSize: typography.bodySize },
  actions: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  button: {
    backgroundColor: colors.bgRaised,
    borderRadius: radii.button,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  buttonText: { color: colors.textPrimary, fontSize: typography.bodySize },
  meta: { color: colors.textMuted, fontSize: typography.metaSize, marginBottom: spacing.sm },
  list: { flex: 1 },
  row: {
    borderBottomColor: colors.borderSubtle,
    borderBottomWidth: 1,
    paddingVertical: spacing.sm
  },
  rowTitle: {
    color: colors.textPrimary,
    fontFamily: typography.monoFamily,
    fontSize: typography.metaSize
  },
  rowBody: {
    color: colors.textSecondary,
    fontFamily: typography.monoFamily,
    fontSize: typography.metaSize
  }
})
