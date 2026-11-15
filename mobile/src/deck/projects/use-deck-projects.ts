import { useMemo } from 'react'
import { DEFAULT_WORKSPACE_STATUSES } from '../../../../src/shared/workspace-statuses'
import { NO_WORKSPACE_ROW_FILTERS } from '../../../../src/shared/workspace-view/workspace-row-filters'
import { HOST_LIST_TARGET, NO_HOST_LIST_INPUT } from '../../host-screen/host-list-queries'
import { defineHostQuery, useHostQuery } from '../../query/host-query'
import { useWorkspaceSections } from '../../worktree/use-workspace-sections'
import {
  buildRepoHostIdByRepoId,
  NO_WORKTREE_HOST_CONTEXT
} from '../../worktree/worktree-host-context-labels'
import { NO_PROJECT_SECTION_CATALOG } from '../../worktree/workspace-list-sections'
import { listHostRepos } from '../../worktree/server-repos'
import type { SectionRepo } from '../../worktree/workspace-list-types'
import type { DeckHostData } from '../host/use-deck-host-data'

const deckServerReposQuery = defineHostQuery<typeof NO_HOST_LIST_INPUT, readonly SectionRepo[]>({
  family: 'deck.repo.list',
  fetch: async (client) => {
    const repos = await listHostRepos(client)
    if (repos === null) {
      throw new Error('repo.list returned an unreadable response')
    }
    return repos.flatMap((repo) =>
      typeof repo.displayName === 'string' && typeof repo.path === 'string'
        ? [{ ...repo, displayName: repo.displayName, path: repo.path }]
        : []
    )
  },
  staleTime: 30_000,
  signal: { events: ['reposChanged'], floorMs: 3000 }
})

const NO_COLLAPSED_GROUPS = new Set<string>()
const NO_PINNED_IDS = new Set<string>()

export function useDeckProjects(data: DeckHostData, hostId: string) {
  const client = data.allClients.find((entry) => entry.hostId === hostId)?.client ?? null
  const reposRead = useHostQuery(
    deckServerReposQuery,
    { hostId, client },
    HOST_LIST_TARGET,
    NO_HOST_LIST_INPUT
  )
  const repos = useMemo(() => reposRead.data ?? [], [reposRead.data])
  const worktrees = useMemo(
    () =>
      (data.catalogs[hostId]?.worktrees ?? []).filter((worktree) => worktree.isArchived !== true),
    [data.catalogs, hostId]
  )
  const repoHostIdByRepoId = useMemo(() => buildRepoHostIdByRepoId(repos), [repos])
  const projectCatalog = useMemo(() => ({ ...NO_PROJECT_SECTION_CATALOG, repos }), [repos])
  const sections = useWorkspaceSections({
    displayWorktrees: [...worktrees],
    hostContextOf: NO_WORKTREE_HOST_CONTEXT,
    sortMode: 'recent',
    filters: NO_WORKSPACE_ROW_FILTERS,
    search: '',
    groupMode: 'repo',
    pinnedIds: NO_PINNED_IDS,
    showPinnedInGroups: true,
    projectCatalog,
    filterCatalogRepos: repos,
    collapsedGroups: NO_COLLAPSED_GROUPS,
    workspaceStatuses: DEFAULT_WORKSPACE_STATUSES,
    repoHostIdByRepoId
  })
  return {
    ...sections,
    error: reposRead.error?.message ?? null,
    loading: reposRead.isPending || (client !== null && data.catalogs[hostId] === undefined)
  }
}
