import { useState, type ReactNode } from 'react'
import { Text, View } from 'react-native'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import type { MobileChatPermission } from '../../session/native-chat/input/mobile-native-chat-permission'
import { FocusableOrca } from '../focus/focusable-orca'
import { DeckTextField } from '../keys/deck-text-field'
import { useDeckTheme } from '../theme/deck-theme'
import { acceptsDenyFeedback } from './deny-feedback'

export function DenyWithFeedback({
  prompt,
  onSubmit
}: {
  prompt: MobileChatPermission | null
  onSubmit: (feedback: string) => void
}): ReactNode {
  const t = useMobileTranslation()
  const theme = useDeckTheme()
  const [feedback, setFeedback] = useState('')
  if (!acceptsDenyFeedback(prompt)) {
    return null
  }
  return (
    <View style={{ padding: theme.space.sm, gap: theme.space.xs }}>
      <DeckTextField
        value={feedback}
        onChangeText={setFeedback}
        placeholder={t('deck.denyFeedback.placeholder', 'Tell the agent what to change')}
        accessibilityLabel={t('deck.denyFeedback.placeholder', 'Tell the agent what to change')}
        multiline
      />
      <FocusableOrca
        zone="list"
        id="deny-with-feedback"
        order={0}
        disabled={feedback.trim() === ''}
        onActivate={() => onSubmit(feedback.trim())}
        accessibilityLabel={t('deck.denyFeedback.action', 'Deny with feedback')}
      >
        <Text style={{ color: feedback.trim() ? theme.color.need : theme.color.text3 }}>
          {t('deck.denyFeedback.action', 'Deny with feedback')}
        </Text>
      </FocusableOrca>
    </View>
  )
}
