import { useEffect, type ReactNode } from 'react'
import { View } from 'react-native'
import { useRouter } from 'expo-router'
import { useDeckTheme } from './theme/deck-theme'
import { DeckUpdateNotice } from './updates/DeckUpdateNotice'
import {
  deckUpdateStore,
  ensureDeckUpdateChecked,
  useDeckUpdate
} from './updates/deck-update-runtime'

/**
 * The deck's frame: the page every destination draws into. Inherits the RPC client and the
 * controller shell from the root layout, so nothing here owns a connection or a controller.
 */
export function DeckShell({ children }: { children?: ReactNode }): ReactNode {
  const theme = useDeckTheme()
  const router = useRouter()
  const update = useDeckUpdate()

  // DECK-R47: a check when the deck is first opened, never a wall in front of it.
  useEffect(ensureDeckUpdateChecked, [])

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.base }}>
      {children}
      {update.kind === 'available' ? (
        <View
          style={{
            position: 'absolute',
            left: theme.space.md,
            right: theme.space.md,
            bottom: theme.space.md
          }}
        >
          <DeckUpdateNotice
            version={update.release.version}
            onOpen={() => router.push('/deck/settings')}
            onDismiss={() => deckUpdateStore.dismiss()}
          />
        </View>
      ) : null}
    </View>
  )
}
