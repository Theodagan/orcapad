import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { View } from 'react-native'
import { usePathname, useRouter } from 'expo-router'
import { useDeckTheme } from './theme/deck-theme'
import { DeckUpdateNotice } from './updates/DeckUpdateNotice'
import { DeckScrollProvider, type DeckScrollHandler } from './controller/deck-scroll-registration'
import { useDeckBindings } from './controller/use-deck-bindings'
import { useDeckScroll } from './controller/use-deck-scroll'
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
  const pathname = usePathname()
  const scrollHandler = useRef<DeckScrollHandler | null>(null)
  const registerScroll = useCallback((handler: DeckScrollHandler) => {
    scrollHandler.current = handler
    return () => {
      if (scrollHandler.current === handler) {
        scrollHandler.current = null
      }
    }
  }, [])
  const scrollHandlers = useDeckScroll((points) => scrollHandler.current?.(points))
  useDeckBindings({
    scope: pathname.startsWith('/deck/s/') ? 'session' : 'root',
    handlers: scrollHandlers
  })
  const update = useDeckUpdate()

  // DECK-R47: a check when the deck is first opened, never a wall in front of it.
  useEffect(ensureDeckUpdateChecked, [])

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.base }}>
      <DeckScrollProvider value={registerScroll}>{children}</DeckScrollProvider>
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
