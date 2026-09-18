import { brandId, type BrandedId } from './branded-id'
import type { AgentId } from './agent'
import type { ConnectionId } from './connection'
import type { WorkspaceId } from './workspace'

export type SessionId = BrandedId<'SessionId'>

export function sessionId(value: string): SessionId {
  return brandId(value)
}

export const SESSION_SURFACES = ['agent', 'terminal', 'document'] as const
export type SessionSurface = (typeof SESSION_SURFACES)[number]

/**
 * The only vocabulary for whether remote work is running. Loss of contact is
 * `unverifiable`, never `exited`: the execution host is the only party that can
 * observe its own processes.
 */
export const EXECUTION_STATES = ['live', 'unverifiable', 'exited'] as const
export type ExecutionState = (typeof EXECUTION_STATES)[number]

export type Session = {
  readonly id: SessionId
  readonly workspaceId: WorkspaceId
  readonly connectionId: ConnectionId
  readonly surface: SessionSurface
  readonly title: string
  readonly isActive: boolean
  readonly executionState: ExecutionState
  readonly agentId: AgentId | null
  readonly updatedAt: number
}
