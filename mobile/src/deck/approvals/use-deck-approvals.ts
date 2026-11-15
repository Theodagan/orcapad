import { useMemo } from 'react'
import { selectAgentsNeedingYou, type AgentListRow } from '../../agents/agent-list-rows'
import { useDeckHostData, type DeckHostData } from '../host/use-deck-host-data'

export type DeckApprovalsData = DeckHostData & {
  readonly approvals: readonly AgentListRow[]
}

export function useDeckApprovals(): DeckApprovalsData {
  const data = useDeckHostData()
  const approvals = useMemo(() => selectAgentsNeedingYou(data.agentList), [data.agentList])
  return { ...data, approvals }
}
