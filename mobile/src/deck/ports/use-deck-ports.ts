import { HOST_LIST_TARGET, NO_HOST_LIST_INPUT } from '../../host-screen/host-list-queries'
import { defineHostQuery, useHostQuery } from '../../query/host-query'
import { lenientList, lenientNumber, lenientRecord, lenientText } from '../host/lenient-host-data'
import type { DeckHostData } from '../host/use-deck-host-data'

export type DeckPort = {
  readonly id: string
  readonly host: string
  readonly port: number
  readonly processName: string
  readonly protocol: string
  readonly project: string
  readonly worktreeId: string | null
}

export type DeckPortScan = {
  readonly ports: readonly DeckPort[]
  readonly unavailableReason: string | null
}

function readPort(raw: unknown): DeckPort | null {
  const value = lenientRecord(raw)
  const port = lenientNumber(value.port, 0)
  if (port <= 0) {
    return null
  }
  const owner = lenientRecord(value.owner)
  const host = lenientText(value.connectHost) || lenientText(value.bindHost)
  const id = lenientText(value.id) || `${host}:${port}:${lenientText(value.pid)}`
  return {
    id,
    host,
    port,
    processName: lenientText(value.processName),
    protocol: lenientText(value.protocol) || 'unknown',
    project: lenientText(owner.displayName) || lenientText(value.displayName),
    worktreeId: lenientText(owner.worktreeId) || null
  }
}

export function readDeckPortScan(raw: unknown): DeckPortScan {
  const value = lenientRecord(raw)
  return {
    ports: lenientList(value.ports, readPort),
    unavailableReason: lenientText(value.unavailableReason) || null
  }
}

const deckPortsQuery = defineHostQuery<typeof NO_HOST_LIST_INPUT, DeckPortScan>({
  family: 'deck.workspacePorts.scan',
  fetch: async (client) => {
    const reply = await client.sendRequest('workspacePorts.scan', {})
    if (!reply.ok) {
      throw new Error(reply.error.message)
    }
    return readDeckPortScan(reply.result)
  },
  staleTime: 3000
})

export function useDeckPorts(data: DeckHostData, hostId: string) {
  const client = data.allClients.find((entry) => entry.hostId === hostId)?.client ?? null
  const read = useHostQuery(
    deckPortsQuery,
    { hostId, client },
    HOST_LIST_TARGET,
    NO_HOST_LIST_INPUT,
    { refetchInterval: 5000 }
  )
  return {
    scan: read.data ?? { ports: [], unavailableReason: null },
    error: read.error?.message ?? null,
    loading: read.isPending
  }
}
