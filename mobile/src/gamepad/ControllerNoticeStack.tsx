import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { spacing } from '../theme/mobile-theme'

/** One slot for the shell's transient notices, so two showing at once stack instead of overlapping. */
export function ControllerNoticeStack({ children }: { readonly children: ReactNode }): ReactNode {
  return (
    <View pointerEvents="none" style={styles.stack}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  stack: {
    alignItems: 'center',
    gap: spacing.sm,
    left: 0,
    position: 'absolute',
    right: 0,
    top: spacing.xl
  }
})
