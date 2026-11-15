import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueries, type QueryObserverResult } from '@tanstack/react-query'
import type { AgentListInput } from '../../agents/agent-list-rows'
import { useMobileHomeHostConnections } from '../../home/use-mobile-home-host-connections'
import { useSharedNow } from '../../hooks/use-now'
import { HOST_LIST_TARGET, NO_HOST_LIST_INPUT } from '../../host-screen/host-list-queries'
import { hostObserverOptions } from '../../query/host-query'
import { isHostNotConnectedError } from '../../query/host-query-errors'
import {
  selectConnectableHostProfiles,
  sortHostsByLastConnected
} from '../../transport/hosts/host-catalog-selection'
import { loadHostCatalog } from '../../transport/hosts/host-store'
import type { HostCatalogEntry } from '../../transport/hosts/host-profile'
import type { RpcClient } from '../../transport/rpc/rpc-client-contract'
import {
  homeWorktreeCountsQuery,
  type HomeWorktreeCounts
} from '../../worktree/home-host-worktree-fetch'
import { homeWorktreeInfo, type HostWorktreeInfo } from '../../worktree/home-worktree-info'
import type { WorktreeCatalogSnapshot } from '../../worktree/worktree-catalog-snapshot-client'

export type DeckHostData = {
  readonly agentList: AgentListInput
  readonly allClients: readonly { hostId: string; client: RpcClient }[]
  readonly catalogs: Readonly<Record<string, WorktreeCatalogSnapshot | undefined>>
  readonly error: string | null
  readonly hostCatalog: readonly HostCatalogEntry[]
  readonly hostCatalogLoaded: boolean
  readonly hosts: AgentListInput['hosts']
  readonly hostStates: AgentListInput['hostStates']
  readonly loading: boolean
  readonly worktreeInfo: Readonly<Record<string, HostWorktreeInfo>>
}

export function useDeckHostData(): DeckHostData {
  const [hostCatalog, setHostCatalog] = useState<HostCatalogEntry[]>([])
  const [hostCatalogLoaded, setHostCatalogLoaded] = useState(false)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  useEffect(() => {
    let mounted = true
    void loadHostCatalog()
      .then((catalog) => {
        if (mounted) {
          setHostCatalog(catalog)
          setHostCatalogLoaded(true)
        }
      })
      .catch((error: unknown) => {
        if (mounted) {
          setCatalogError(error instanceof Error ? error.message : String(error))
          setHostCatalogLoaded(true)
        }
      })
    return () => {
      mounted = false
    }
  }, [])

  const hosts = useMemo(
    () => sortHostsByLastConnected(selectConnectableHostProfiles(hostCatalog)),
    [hostCatalog]
  )
  const connections = useMobileHomeHostConnections(hosts, hostCatalog)
  const { allClients, hostLastConnected, hostStates } = connections
  const homeHosts = useMemo(() => {
    const clients = new Map(allClients.map((entry) => [entry.hostId, entry.client]))
    return hosts.map((host) => ({ hostId: host.id, client: clients.get(host.id) ?? null }))
  }, [allClients, hosts])
  const isLive = useCallback(
    (hostId: string, readAt: number): boolean => {
      const connectedAt = hostLastConnected[hostId]
      return connectedAt != null && readAt >= connectedAt
    },
    [hostLastConnected]
  )
  const queries = useMemo(
    () =>
      homeHosts.map((host) =>
        hostObserverOptions(
          homeWorktreeCountsQuery,
          host.client,
          host.hostId,
          HOST_LIST_TARGET,
          NO_HOST_LIST_INPUT
        )
      ),
    [homeHosts]
  )
  const combine = useCallback(
    (results: QueryObserverResult<HomeWorktreeCounts>[]) => {
      const worktreeInfo: Record<string, HostWorktreeInfo> = {}
      const catalogs: Record<string, WorktreeCatalogSnapshot | undefined> = {}
      let loading = false
      let error: string | null = null
      homeHosts.forEach(({ hostId }, index) => {
        const result = results[index]
        if (!result) {
          loading = true
          return
        }
        loading ||= result.isPending
        const failed = result.isError && !isHostNotConnectedError(result.error)
        if (failed) {
          error = result.error.message
        }
        const info = homeWorktreeInfo(
          hostId,
          {
            data: result.data,
            dataUpdatedAt: result.dataUpdatedAt,
            failed
          },
          isLive
        )
        if (info) {
          worktreeInfo[hostId] = info
        }
        catalogs[hostId] = result.data?.catalog
      })
      return { catalogs, error, loading, worktreeInfo }
    },
    [homeHosts, isLive]
  )
  const reads = useQueries({ queries, combine })
  const now = useSharedNow()
  const agentList = useMemo<AgentListInput>(
    () => ({ hosts, hostStates, worktreeInfo: reads.worktreeInfo, now }),
    [hosts, hostStates, reads.worktreeInfo, now]
  )
  return {
    agentList,
    allClients,
    catalogs: reads.catalogs,
    error: catalogError ?? reads.error,
    hostCatalog,
    hostCatalogLoaded,
    hosts,
    hostStates,
    loading: !hostCatalogLoaded || reads.loading,
    worktreeInfo: reads.worktreeInfo
  }
}
