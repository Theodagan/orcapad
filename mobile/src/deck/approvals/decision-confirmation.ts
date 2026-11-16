import type { MobileChatPermission } from '../../session/native-chat/input/mobile-native-chat-permission'

export type DecisionOption = MobileChatPermission['options'][number]
export type DecisionConfirmation = {
  readonly requestId: string
  readonly request: MobileChatPermission
  readonly option: DecisionOption
}

export function canConfirmDecision(
  confirmation: DecisionConfirmation,
  currentRequestId: string,
  action: 'trigger' | 'confirm'
): boolean {
  return action === 'confirm' && confirmation.requestId === currentRequestId
}
