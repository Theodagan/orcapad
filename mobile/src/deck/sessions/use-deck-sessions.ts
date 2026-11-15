import { useMemo } from 'react'
import {
  agentStatusGroup,
  byStatusThenRecent,
  everyRow,
  hostAgents,
  type AgentListRow
} from '../../agents/agent-list-rows'
import type { CollectionItem, CollectionStatus } from '../collections/collection-model'
import { useDeckHostData, type DeckHostData } from '../host/use-deck-host-data'

export type DeckSession = CollectionItem & {
  readonly hostId: string
  readonly worktreeId: string
  readonly sessionId: string
  readonly row: AgentListRow
}

export type DeckSessionsData = DeckHostData & {
  readonly sessions: readonly DeckSession[]
}

function sessionStatus(row: AgentListRow): CollectionStatus {
  const group = agentStatusGroup(row.dotState)
  return group === 'working' ? 'running' : group
}

export function useDeckSessions(): DeckSessionsData {
  const data = useDeckHostData()
  const sessions = useMemo(
    () =>
      data.hosts
        .flatMap((host) => everyRow(hostAgents(data.agentList, host.id).roots))
        .filter((row) => !row.stale && !row.offline)
        .sort(byStatusThenRecent)
        .map((row) => ({
          id: row.key,
          title: row.title,
          projectId: row.entry.repo,
          status: sessionStatus(row),
          hostId: row.hostId,
          worktreeId: row.entry.worktreeId,
          sessionId: row.entry.agent.paneKey,
          row
        })),
    [data.agentList, data.hosts]
  )
  return { ...data, sessions }
}
