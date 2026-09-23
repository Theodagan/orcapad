import { useEffect, useState, type ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useController } from '../controller-provider'
import { colors, radii, spacing, typography } from '../../theme/mobile-theme'
import {
  INITIAL_CONNECTION_HISTORY,
  observeConnection,
  shouldWarnAboutDisconnect
} from './controller-connection-notice'

/**
 * A disconnect notice that never blocks. It takes no touches — every underlying control stays
 * reachable while it is up — and it clears itself the moment a pad comes back, because a stale
 * warning about a controller now in the user's hands is worse than none (CTRL-AC6).
 */
export function ControllerConnectionNotice(): ReactNode {
  const { connected } = useController()
  const [history, setHistory] = useState(INITIAL_CONNECTION_HISTORY)

  useEffect(() => {
    setHistory((current) => observeConnection(current, connected))
  }, [connected])

  if (!shouldWarnAboutDisconnect(history)) {
    return null
  }

  return (
    <View pointerEvents="none" style={styles.container}>
      <View style={styles.notice}>
        <Text style={styles.text}>Controller disconnected — touch still works</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: spacing.xl
  },
  notice: {
    backgroundColor: colors.bgRaised,
    borderColor: colors.borderSubtle,
    borderRadius: radii.card,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  },
  text: { color: colors.textSecondary, fontSize: typography.metaSize }
})
