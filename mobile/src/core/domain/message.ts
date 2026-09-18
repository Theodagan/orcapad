import { brandId, type BrandedId } from './branded-id'
import type { SessionId } from './session'

export type MessageId = BrandedId<'MessageId'>

export function messageId(value: string): MessageId {
  return brandId(value)
}

export const TOOL_CALL_STATES = ['running', 'completed', 'failed'] as const
export type ToolCallState = (typeof TOOL_CALL_STATES)[number]

export type MessageBody =
  | { readonly kind: 'user'; readonly text: string }
  | { readonly kind: 'assistant'; readonly text: string }
  | {
      readonly kind: 'tool'
      readonly name: string
      readonly input: string | null
      readonly state: ToolCallState
    }
  | {
      readonly kind: 'diff'
      readonly path: string
      readonly added: number
      readonly removed: number
    }
  | { readonly kind: 'notice'; readonly text: string }

export type Message = {
  readonly id: MessageId
  readonly sessionId: SessionId
  readonly body: MessageBody
  readonly createdAt: number
}
