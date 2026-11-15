import { useMemo, type ReactNode } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { DEFAULT_REPO_BADGE_COLOR } from '../../../../src/shared/repo-badge-color'
import { getWorktreeCardDetails } from '../../../../src/shared/worktree/card-properties'
import { MobileStateView } from '../../components/MobileStateView'
import { WorktreeListRow } from '../../components/WorktreeListRow'
import { useRepoLookById } from '../../host-screen/host-repo-looks'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { INITIAL_MOBILE_VIEW } from '../../worktree/workspace-view-settings'
import { getWorktreeDotStatus, hasWorktreeAgentState } from '../../worktree/workspace-list-ordering'
import type { Worktree } from '../../worktree/workspace-list-types'
import { FocusableOrca } from '../focus/focusable-orca'
import { useDeckHostData, type DeckHostData } from '../host/use-deck-host-data'
import { useDeckTheme } from '../theme/deck-theme'
import { useDeckProjects } from './use-deck-projects'

const CARD_DETAILS = getWorktreeCardDetails(INITIAL_MOBILE_VIEW.worktreeCardProperties, {
  compactWorktreeCards: false,
  newCardStyle: false
})

function workspaceRoute(hostId: string, worktree: Worktree): string {
  return `/deck/w/${encodeURIComponent(hostId)}/${encodeURIComponent(worktree.worktreeId)}?projectId=${encodeURIComponent(worktree.repoId)}`
}

function DeckHostProjects({ data, hostId }: { data: DeckHostData; hostId: string }): ReactNode {
  const router = useRouter()
  const t = useMobileTranslation()
  const theme = useDeckTheme()
  const projects = useDeckProjects(data, hostId)
  const repoLooks = useRepoLookById(projects.repoById)
  const host = data.hosts.find((candidate) => candidate.id === hostId)
  const rows = useMemo(
    () => projects.sections.flatMap((section) => section.data),
    [projects.sections]
  )
  const open = (worktree: Worktree): void => {
    router.push(workspaceRoute(hostId, worktree))
  }
  return (
    <View>
      <Text
        style={{
          color: theme.color.text1,
          fontSize: theme.text.title,
          padding: theme.space.md
        }}
      >
        {host?.name ?? hostId}
      </Text>
      {projects.error ? (
        <Text style={{ color: theme.color.risk, padding: theme.space.md }}>{projects.error}</Text>
      ) : null}
      {projects.sections.map((section) => (
        <View key={`${hostId}:${section.key}`}>
          <Text
            style={{
              color: theme.color.text2,
              fontSize: theme.text.meta,
              paddingHorizontal: theme.space.md,
              paddingVertical: theme.space.sm
            }}
          >
            {section.title}
          </Text>
          {section.data.map(({ row, view }, index) => (
            <FocusableOrca
              key={`${hostId}:${row.worktreeId}`}
              zone="list"
              id={`project:${hostId}:${row.worktreeId}`}
              order={index}
              onActivate={() => open(row)}
              accessibilityLabel={row.displayName || row.repo}
            >
              <WorktreeListRow
                item={row}
                view={view}
                isReadOnly={data.hostStates[hostId] !== 'connected'}
                repoColor={repoLooks.get(row.repoId)?.color ?? DEFAULT_REPO_BADGE_COLOR}
                repoIcon={repoLooks.get(row.repoId)?.icon ?? null}
                hideRepo={section.repo !== undefined}
                cardDetails={CARD_DETAILS}
                agentActivityDisplayMode="compact"
                status={hasWorktreeAgentState(row) ? getWorktreeDotStatus(row) : null}
                statusLive={data.hostStates[hostId] === 'connected'}
                onPress={open}
                onAgentPress={(worktree, paneKey) => {
                  router.push(
                    `${workspaceRoute(hostId, worktree).replace('/deck/w/', '/deck/s/')}&sessionId=${encodeURIComponent(paneKey)}`
                  )
                }}
              />
            </FocusableOrca>
          ))}
        </View>
      ))}
      {!projects.loading && rows.length === 0 && projects.sections.length === 0 ? (
        <MobileStateView
          title={t('deck.projects.hostEmpty', 'No projects reported by this desktop.')}
        />
      ) : null}
    </View>
  )
}

export function DeckProjects(): ReactNode {
  const t = useMobileTranslation()
  const data = useDeckHostData()
  if (data.error) {
    return (
      <MobileStateView
        title={t('deck.projects.error', 'Couldn’t load projects')}
        message={data.error}
      />
    )
  }
  if (data.loading && data.hosts.length === 0) {
    return <MobileStateView loading title={t('deck.projects.loading', 'Loading projects…')} />
  }
  if (data.hosts.length === 0) {
    return (
      <MobileStateView
        title={t('deck.projects.empty.title', 'No paired desktops')}
        message={t('deck.projects.empty.body', 'Pair a desktop in Orca to see its projects here.')}
      />
    )
  }
  return (
    <ScrollView>
      {data.hosts.map((host) => (
        <DeckHostProjects key={host.id} data={data} hostId={host.id} />
      ))}
    </ScrollView>
  )
}
