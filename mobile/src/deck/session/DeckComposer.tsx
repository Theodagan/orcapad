import { useState, type ReactNode } from 'react'
import { Text, View } from 'react-native'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import type { MobileNativeChatController } from '../../session/native-chat/mobile-native-chat-controller-contract'
import { useMobileNativeChatDraft } from '../../session/native-chat/composer/mobile-native-chat-draft-store'
import { FocusableOrca } from '../focus/focusable-orca'
import { DeckTextField } from '../keys/deck-text-field'
import { useDeckTheme } from '../theme/deck-theme'
import { AgentPanel } from './AgentPanel'

export function DeckComposer({
  controller
}: {
  controller: MobileNativeChatController
}): ReactNode {
  const t = useMobileTranslation()
  const theme = useDeckTheme()
  const draft = useMobileNativeChatDraft(controller.chatDraftKey)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const send = async (): Promise<void> => {
    if (sending || draft.trim() === '') {
      return
    }
    setSending(true)
    setError(null)
    try {
      const accepted = await controller.handleNativeChatSend(draft)
      if (!accepted) {
        setError(
          t(
            'deck.composer.unconfirmed',
            'The message was not accepted. Check chat before retrying.'
          )
        )
      }
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setSending(false)
    }
  }
  return (
    <View
      style={{ padding: theme.space.sm, gap: theme.space.xs, backgroundColor: theme.color.panel }}
    >
      <AgentPanel options={controller.nativeChatSessionOptions} />
      <DeckTextField
        value={draft}
        onChangeText={controller.setChatComposerText}
        placeholder={t('deck.composer.placeholder', 'Message this agent')}
        accessibilityLabel={t('deck.composer.placeholder', 'Message this agent')}
        onSubmitEditing={() => void send()}
        editable={!sending}
        multiline
      />
      {error ? (
        <Text style={{ color: theme.color.risk, fontSize: theme.text.meta }}>{error}</Text>
      ) : null}
      <FocusableOrca
        zone="list"
        id="session-send"
        order={0}
        disabled={sending || draft.trim() === ''}
        onActivate={() => void send()}
        accessibilityLabel={t('deck.composer.send', 'Send')}
      >
        <Text
          style={{
            color: sending || draft.trim() === '' ? theme.color.text3 : theme.color.accent,
            fontSize: theme.text.body,
            alignSelf: 'flex-end'
          }}
        >
          {sending ? t('deck.composer.sending', 'Sending…') : t('deck.composer.send', 'Send')}
        </Text>
      </FocusableOrca>
    </View>
  )
}
