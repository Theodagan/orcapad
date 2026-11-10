import type { ReactNode } from 'react'
import { View } from 'react-native'
import { useDeckTheme } from './theme/deck-theme'

/**
 * The deck's frame: the page every destination draws into. Inherits the RPC client and the
 * controller shell from the root layout, so nothing here owns a connection or a controller.
 */
export function DeckShell({ children }: { children?: ReactNode }): ReactNode {
  const theme = useDeckTheme()
  return <View style={{ flex: 1, backgroundColor: theme.color.base }}>{children}</View>
}
