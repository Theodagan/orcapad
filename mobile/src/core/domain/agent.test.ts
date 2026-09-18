import { describe, expect, it } from 'vitest'
import { agentId, checkAgentRules, type Agent } from './agent'
import { sessionId } from './session'
import { workspaceId } from './workspace'

function agent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: agentId('a-1'),
    sessionId: sessionId('s-1'),
    workspaceId: workspaceId('w-1'),
    kind: 'claude',
    activity: 'settled',
    model: null,
    currentTool: null,
    lastPrompt: '',
    lastReply: null,
    parentId: null,
    activitySince: 0,
    updatedAt: 0,
    staleFromRestore: false,
    ...overrides
  }
}

describe('checkAgentRules', () => {
  it('accepts a settled agent', () => {
    expect(checkAgentRules(agent())).toEqual([])
  })

  it('accepts a restored agent whose activity is unknown', () => {
    expect(checkAgentRules(agent({ staleFromRestore: true, activity: 'unknown' }))).toEqual([])
  })

  it('rejects a restored agent that claims a live activity', () => {
    const violations = checkAgentRules(agent({ staleFromRestore: true, activity: 'working' }))

    expect(violations.map((violation) => violation.rule)).toEqual([
      'restored-agent-activity-is-unknown'
    ])
  })

  it('accepts a tool on a working agent', () => {
    expect(checkAgentRules(agent({ activity: 'working', currentTool: 'Bash' }))).toEqual([])
  })

  it('rejects a tool on an agent that is not working', () => {
    const violations = checkAgentRules(agent({ activity: 'needs-input', currentTool: 'Bash' }))

    expect(violations.map((violation) => violation.rule)).toEqual(['current-tool-requires-working'])
  })

  it('rejects an agent that is its own parent', () => {
    const violations = checkAgentRules(agent({ parentId: agentId('a-1') }))

    expect(violations.map((violation) => violation.rule)).toEqual(['agent-lineage-is-acyclic'])
  })

  it('reports every violation on one agent', () => {
    const violations = checkAgentRules(
      agent({ staleFromRestore: true, activity: 'working', currentTool: 'Bash', parentId: agentId('a-1') })
    )

    expect(violations.map((violation) => violation.rule)).toEqual([
      'restored-agent-activity-is-unknown',
      'agent-lineage-is-acyclic'
    ])
  })
})
