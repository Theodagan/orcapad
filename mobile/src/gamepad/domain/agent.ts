import { brandId, type BrandedId } from './branded-id'
import type { DomainRuleViolation } from './domain-rule'
import type { SessionId } from './session'
import type { WorkspaceId } from './workspace'

export type AgentId = BrandedId<'AgentId'>

export function agentId(value: string): AgentId {
  return brandId(value)
}

export const AGENT_ACTIVITIES = ['working', 'needs-input', 'settled', 'unknown'] as const
export type AgentActivity = (typeof AGENT_ACTIVITIES)[number]

export type Agent = {
  readonly id: AgentId
  readonly sessionId: SessionId | null
  readonly workspaceId: WorkspaceId
  /** Open set: the launchable agent ids plus any custom agent the host reports. */
  readonly kind: string
  readonly activity: AgentActivity
  readonly model: string | null
  readonly currentTool: string | null
  readonly lastPrompt: string
  readonly lastReply: string | null
  /** Subagent lineage; null for a top-level agent. */
  readonly parentId: AgentId | null
  readonly activitySince: number
  readonly updatedAt: number
  /** Restored from the host's disk on start and not yet reconfirmed by a live report. */
  readonly staleFromRestore: boolean
}

export function checkAgentRules(agent: Agent): readonly DomainRuleViolation[] {
  const violations: DomainRuleViolation[] = []

  if (agent.staleFromRestore && agent.activity !== 'unknown') {
    violations.push({
      rule: 'restored-agent-activity-is-unknown',
      detail: `agent ${agent.id} was restored unconfirmed but reports ${agent.activity}`
    })
  }

  if (agent.currentTool !== null && agent.activity !== 'working') {
    violations.push({
      rule: 'current-tool-requires-working',
      detail: `agent ${agent.id} reports tool ${agent.currentTool} while ${agent.activity}`
    })
  }

  if (agent.parentId === agent.id) {
    violations.push({
      rule: 'agent-lineage-is-acyclic',
      detail: `agent ${agent.id} is its own parent`
    })
  }

  return violations
}
