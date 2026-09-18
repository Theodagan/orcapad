import { brandId, type BrandedId } from './branded-id'
import type { SessionId } from './session'

/** Something the agent needs the user to decide: the controller's intervention surface. */
export type TaskId = BrandedId<'TaskId'>

export function taskId(value: string): TaskId {
  return brandId(value)
}

export type TaskPrompt =
  | { readonly kind: 'approval'; readonly summary: string }
  | { readonly kind: 'question'; readonly question: string }

export type TaskOption = {
  readonly id: string
  readonly label: string
  readonly isDefault: boolean
}

export const TASK_RESOLUTIONS = ['pending', 'resolved', 'cancelled'] as const
export type TaskResolution = (typeof TASK_RESOLUTIONS)[number]

export type Task = {
  readonly id: TaskId
  readonly sessionId: SessionId
  readonly prompt: TaskPrompt
  readonly options: readonly TaskOption[]
  readonly resolution: TaskResolution
  readonly createdAt: number
}
