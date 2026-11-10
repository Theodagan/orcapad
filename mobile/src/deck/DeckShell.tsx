import type { ReactNode } from 'react'
import { View } from 'react-native'
import { colors } from '../theme/mobile-theme'
import { themedStyleSheet } from '../theme/themed-styles'
import { useMobileColorScheme } from '../theme/use-mobile-color-scheme'

/**
 * The deck's frame: the page every destination draws into. Inherits the RPC client and the
 * controller shell from the root layout, so nothing here owns a connection or a controller.
 */
export function DeckShell({ children }: { children?: ReactNode }): ReactNode {
  useMobileColorScheme()
  return <View style={styles.frame}>{children}</View>
}

const styles = themedStyleSheet(() => ({
  frame: {
    flex: 1,
    backgroundColor: colors.bgBase
  }
}))
