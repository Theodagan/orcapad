import { useMemo, type ReactNode } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { skipToken, useQuery } from '@tanstack/react-query'
import { accountsSnapshotKey } from '../../accounts/accounts-snapshot-stream'
import { ProviderUsageWindows } from '../../accounts/ProviderUsageWindows'
import {
  agentStatusGroup,
  byStatusThenRecent,
  everyRow,
  hostAgents,
  selectAgentsNeedingYou,
  type AgentStatusGroup
} from '../../agents/agent-list-rows'
import { getActiveProviderRateLimits, type AccountsSnapshot } from '../../components/AccountUsage'
import { MobileStateView } from '../../components/MobileStateView'
import { WorktreeAgentList } from '../../components/WorktreeAgentList'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { FocusableOrca } from '../focus/focusable-orca'
import { useDeckHostData, type DeckHostData } from '../host/use-deck-host-data'
import { useDeckTheme } from '../theme/deck-theme'
import { useDeviceStatus } from './use-device-status'

const STATUS_ORDER: readonly AgentStatusGroup[] = ['needs-you', 'working', 'idle', 'done']

function statusKey(status: AgentStatusGroup): string {
  return status === 'working' ? 'deck.status.running' : `deck.status.${status}`
}

function DeckHostOverview({ data, hostId }: { data: DeckHostData; hostId: string }): ReactNode {
  const t = useMobileTranslation()
  const theme = useDeckTheme()
  const router = useRouter()
  const host = data.hosts.find((candidate) => candidate.id === hostId)
  const rows = useMemo(
    () => everyRow(hostAgents(data.agentList, hostId).roots).sort(byStatusThenRecent),
    [data.agentList, hostId]
  )
  const account = useQuery<AccountsSnapshot | null>({
    queryKey: accountsSnapshotKey(hostId),
    queryFn: skipToken
  })
  const open = (paneKey: string): void => {
    const row = rows.find((candidate) => candidate.entry.agent.paneKey === paneKey)
    if (!row) {
      return
    }
    router.push(
      `/deck/s/${encodeURIComponent(hostId)}/${encodeURIComponent(row.entry.worktreeId)}?sessionId=${encodeURIComponent(paneKey)}&projectId=${encodeURIComponent(row.entry.repo)}`
    )
  }
  const snapshot = account.data
  const latestTools = rows.filter((row) => row.entry.agent.toolName).slice(0, 5)
  return (
    <View style={{ padding: theme.space.md, gap: theme.space.md }}>
      <Text style={{ color: theme.color.text1, fontSize: theme.text.title }}>
        {host?.name ?? hostId}
      </Text>
      <View>
        <Text style={{ color: theme.color.text2, fontSize: theme.text.body }}>
          {t('deck.overview.accountUsage', 'Account usage')}
        </Text>
        {snapshot ? (
          (['claude', 'codex'] as const).map((provider) => (
            <ProviderUsageWindows
              key={provider}
              limits={getActiveProviderRateLimits(snapshot, provider)}
              now={data.agentList.now}
              showEmptyWindows
            />
          ))
        ) : (
          <Text style={{ color: theme.color.text3, fontSize: theme.text.meta }}>
            {t('deck.overview.noUsage', 'No account usage reported.')}
          </Text>
        )}
      </View>
      <Text style={{ color: theme.color.text3, fontSize: theme.text.meta }}>
        {t('deck.overview.hostMetrics', 'Host CPU / RAM / bandwidth')} —{' '}
        {t(
          'deck.overview.hostMetricsReason',
          'Unavailable: the desktop does not publish these metrics to mobile.'
        )}
      </Text>
      {STATUS_ORDER.map((status) => {
        const statusRows = rows.filter((row) => agentStatusGroup(row.dotState) === status)
        if (statusRows.length === 0) {
          return null
        }
        const agents = statusRows.map((row) => row.entry.agent)
        return (
          <View key={status}>
            <Text style={{ color: theme.color.text2, fontSize: theme.text.body }}>
              {t(statusKey(status), statusKey(status))} · {statusRows.length}
            </Text>
            <FocusableOrca
              zone="list"
              id={`overview:${hostId}:${status}`}
              order={STATUS_ORDER.indexOf(status)}
              onActivate={() => {
                const first = statusRows[0]
                if (first) {
                  open(first.entry.agent.paneKey)
                }
              }}
              accessibilityLabel={t(statusKey(status), statusKey(status))}
            >
              <WorktreeAgentList
                agents={agents}
                unvisited={statusRows.some((row) => row.unread === true)}
                statusLive={!statusRows.every((row) => row.stale)}
                isReadOnly={data.hostStates[hostId] !== 'connected'}
                onAgentPress={open}
                fullList
              />
            </FocusableOrca>
          </View>
        )
      })}
      {rows.length === 0 ? (
        <Text style={{ color: theme.color.text3, fontSize: theme.text.meta }}>
          {t('deck.overview.noAgents', 'No live agents reported by this desktop.')}
        </Text>
      ) : null}
      {latestTools.length > 0 ? (
        <View>
          <Text style={{ color: theme.color.text2, fontSize: theme.text.body }}>
            {t('deck.overview.latestTools', 'Latest tool calls')}
          </Text>
          {latestTools.map((row) => (
            <Text key={row.key} style={{ color: theme.color.text3, fontSize: theme.text.meta }}>
              {row.entry.agent.toolName}
              {row.entry.agent.toolInput ? ` · ${row.entry.agent.toolInput}` : ''}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  )
}

export function DeckOverview(): ReactNode {
  const t = useMobileTranslation()
  const theme = useDeckTheme()
  const data = useDeckHostData()
  const device = useDeviceStatus()
  const needsYou = useMemo(() => selectAgentsNeedingYou(data.agentList), [data.agentList])
  if (data.error) {
    return (
      <MobileStateView
        title={t('deck.overview.error', 'Couldn’t load overview')}
        message={data.error}
      />
    )
  }
  if (!data.hostCatalogLoaded) {
    return <MobileStateView loading title={t('deck.overview.loading', 'Loading overview…')} />
  }
  return (
    <ScrollView>
      <View style={{ padding: theme.space.md, gap: theme.space.xs }}>
        <Text style={{ color: theme.color.text1, fontSize: theme.text.title }}>
          {t('deck.overview.device', 'This device')}
        </Text>
        <Text style={{ color: theme.color.text2, fontSize: theme.text.body }}>
          {t('deck.overview.network', 'Network')}:{' '}
          {device.offline
            ? t('deck.overview.offline', 'Offline')
            : (device.network ?? t('deck.overview.unknown', 'Unknown'))}
        </Text>
        <Text style={{ color: theme.color.text2, fontSize: theme.text.body }}>
          {t('deck.overview.battery', 'Battery')}:{' '}
          {device.batteryPercent === null
            ? t('deck.overview.unknown', 'Unknown')
            : `${device.batteryPercent}%`}
        </Text>
        <Text style={{ color: theme.color.need, fontSize: theme.text.body }}>
          {t('deck.overview.needsYou', 'Needs you')} · {needsYou.length}
        </Text>
      </View>
      {data.hosts.length === 0 ? (
        <MobileStateView
          title={t('deck.overview.empty.title', 'No paired desktops')}
          message={t('deck.overview.empty.body', 'Pair a desktop in Orca to see live agents here.')}
        />
      ) : (
        data.hosts.map((host) => <DeckHostOverview key={host.id} data={data} hostId={host.id} />)
      )}
    </ScrollView>
  )
}
