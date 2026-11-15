import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { isPlanApprovalSubject } from '../../../../src/shared/agent-session/agent-session-approval-subject'
import type { MobileNativeChatController } from '../../session/native-chat/mobile-native-chat-controller-contract'
import { useDeckTheme } from '../theme/deck-theme'
import { HeroBand } from './HeroBand'

export function PromptStrip({ controller }: { controller: MobileNativeChatController }): ReactNode {
  const theme = useDeckTheme()
  const permission = controller.nativeChatPermission
  const question = controller.nativeChatQuestion
  const ask = controller.nativeChatAsk
  if (!permission && !question && !ask) {
    return null
  }
  const title = permission?.title ?? question?.question ?? ask?.questions[0]?.question ?? ''
  const detail =
    permission?.description ??
    permission?.detail ??
    question?.options.join(' · ') ??
    ask?.questions.flatMap((entry) => entry.options.map((option) => option.label)).join(' · ')
  const subject = permission?.subject?.kind === 'plan' ? permission.subject.text : undefined
  return (
    <View>
      <HeroBand title={title} detail={detail} />
      {subject ? (
        <Text
          style={{ color: theme.color.text2, fontSize: theme.text.body, padding: theme.space.sm }}
        >
          {subject}
        </Text>
      ) : null}
      {permission?.options.map((option) => (
        <Text
          key={option.send}
          style={{
            color: theme.color.text2,
            fontSize: theme.text.body,
            paddingHorizontal: theme.space.sm
          }}
        >
          {option.label}
        </Text>
      ))}
    </View>
  )
}
