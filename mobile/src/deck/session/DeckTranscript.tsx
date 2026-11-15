import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { ScrollView } from 'react-native'
import { MobileStateView } from '../../components/MobileStateView'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import type { MobileNativeChatController } from '../../session/native-chat/mobile-native-chat-controller-contract'
import { MobileNativeChatMessage } from '../../session/native-chat/transcript/MobileNativeChatMessage'
import { useDeckScrollRegistration } from '../controller/deck-scroll-registration'
import { useDeckTheme } from '../theme/deck-theme'

export function DeckTranscript({
  controller
}: {
  controller: MobileNativeChatController
}): ReactNode {
  const t = useMobileTranslation()
  const theme = useDeckTheme()
  const scroll = useRef<ScrollView>(null)
  const offset = useRef(0)
  const session = controller.nativeChatSession
  useDeckScrollRegistration(
    useCallback((points: number) => {
      offset.current = Math.max(0, offset.current + points)
      scroll.current?.scrollTo({ y: offset.current, animated: false })
    }, [])
  )
  useEffect(() => {
    scroll.current?.scrollToEnd({ animated: false })
  }, [session.messages.length])
  if (session.error) {
    return (
      <MobileStateView
        title={t('deck.transcript.error', 'Couldn’t load chat')}
        message={session.error}
      />
    )
  }
  if (session.transcriptLoading && session.messages.length === 0) {
    return <MobileStateView loading title={t('deck.transcript.loading', 'Loading chat…')} />
  }
  if (session.messages.length === 0) {
    return (
      <MobileStateView
        title={t('deck.transcript.empty.title', 'No messages yet')}
        message={t('deck.transcript.empty.body', 'Send a prompt below to start this session.')}
      />
    )
  }
  return (
    <ScrollView
      ref={scroll}
      onScroll={(event) => {
        offset.current = event.nativeEvent.contentOffset.y
      }}
      contentContainerStyle={{ gap: theme.space.sm, padding: theme.space.md }}
    >
      {session.messages.map((message) => (
        <MobileNativeChatMessage key={message.id} message={message} fontScale={1} />
      ))}
    </ScrollView>
  )
}
