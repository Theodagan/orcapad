import { isPlanApprovalSubject } from '../../../../src/shared/agent-session/agent-session-approval-subject'
import type { MobileChatPermission } from '../../session/native-chat/input/mobile-native-chat-permission'

export function acceptsDenyFeedback(prompt: MobileChatPermission | null): boolean {
  return prompt !== null && isPlanApprovalSubject(prompt.subject)
}
