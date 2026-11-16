import { useState, type ReactNode } from 'react'
import { Text, View } from 'react-native'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { isPlanApprovalSubject } from '../../../../src/shared/agent-session/agent-session-approval-subject'
import type { MobileNativeChatController } from '../../session/native-chat/mobile-native-chat-controller-contract'
import { FocusableOrca } from '../focus/focusable-orca'
import { useDeckTheme } from '../theme/deck-theme'
import { HeroBand } from './HeroBand'
import {
  canConfirmDecision,
  type DecisionConfirmation,
  type DecisionOption
} from './decision-confirmation'
import { DecisionConfirm } from './DecisionConfirm'
import { DenyWithFeedback } from './DenyWithFeedback'

export function PromptStrip({ controller }: { controller: MobileNativeChatController }): ReactNode {
  const t = useMobileTranslation()
  const theme = useDeckTheme()
  const [confirmation, setConfirmation] = useState<DecisionConfirmation | null>(null)
  const [pendingFeedback, setPendingFeedback] = useState<string | null>(null)
  const permission = controller.nativeChatPermission
  const question = controller.nativeChatQuestion
  const ask = controller.nativeChatAsk
  const requestId = permission?.prompt?.itemId ?? controller.nativeChatPromptKey ?? null
  if (!permission && !question && !ask) {
    return null
  }
  const title = permission?.title ?? question?.question ?? ask?.questions[0]?.question ?? ''
  const detail =
    permission?.description ??
    permission?.detail ??
    question?.options.join(' · ') ??
    ask?.questions.flatMap((entry) => entry.options.map((option) => option.label)).join(' · ')
  const approvalSubject = permission?.subject
  const subject = isPlanApprovalSubject(approvalSubject) ? approvalSubject.text : undefined
  const choose = (option: DecisionOption): void => {
    if (permission && requestId) {
      setConfirmation({ requestId, request: permission, option })
    }
  }
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
      {permission && !requestId ? (
        <Text
          style={{ color: theme.color.text3, fontSize: theme.text.meta, padding: theme.space.sm }}
        >
          {t(
            'deck.decision.unbound',
            'This request has no stable identity, so decisions are disabled.'
          )}
        </Text>
      ) : null}
      {permission?.options.map((option, index) => (
        <FocusableOrca
          key={option.send}
          zone="list"
          id={`prompt-option:${option.send}`}
          order={index}
          disabled={!requestId}
          onActivate={() => choose(option)}
          accessibilityLabel={option.label}
        >
          <Text
            style={{
              color: requestId ? theme.color.accent : theme.color.text3,
              fontSize: theme.text.body,
              padding: theme.space.sm
            }}
          >
            {option.label}
          </Text>
        </FocusableOrca>
      ))}
      <DenyWithFeedback
        prompt={permission}
        onSubmit={(feedback) => {
          const option = permission?.options.find((candidate) =>
            /deny|reject|refine/i.test(candidate.label)
          )
          if (permission && requestId && option) {
            setPendingFeedback(feedback)
            setConfirmation({ requestId, request: permission, option })
          }
        }}
      />
      <DecisionConfirm
        confirmation={confirmation}
        currentRequestId={requestId}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => {
          if (confirmation && requestId && canConfirmDecision(confirmation, requestId, 'confirm')) {
            void controller
              .handleNativeChatRespondPermission(confirmation.option.send)
              .then((accepted) => {
                if (accepted && pendingFeedback) {
                  void controller.handleNativeChatSend(pendingFeedback)
                  setPendingFeedback(null)
                }
              })
          }
        }}
      />
    </View>
  )
}
