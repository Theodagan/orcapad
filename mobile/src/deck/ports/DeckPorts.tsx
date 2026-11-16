import type { ReactNode } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { MobileStateView } from '../../components/MobileStateView'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { useDeckHostData, type DeckHostData } from '../host/use-deck-host-data'
import { useDeckTheme } from '../theme/deck-theme'
import { useDeckPorts } from './use-deck-ports'

function DeckHostPorts({ data, hostId }: { data: DeckHostData; hostId: string }): ReactNode {
  const t = useMobileTranslation()
  const theme = useDeckTheme()
  const host = data.hosts.find((candidate) => candidate.id === hostId)
  const { scan, error, loading } = useDeckPorts(data, hostId)
  return (
    <View style={{ padding: theme.space.md, gap: theme.space.sm }}>
      <Text style={{ color: theme.color.text1, fontSize: theme.text.title }}>
        {host?.name ?? hostId}
      </Text>
      {error ? (
        <Text style={{ color: theme.color.risk, fontSize: theme.text.body }}>{error}</Text>
      ) : null}
      {scan.unavailableReason ? (
        <Text style={{ color: theme.color.text3, fontSize: theme.text.body }}>
          {scan.unavailableReason}
        </Text>
      ) : null}
      {scan.ports.map((port) => (
        <View key={port.id} style={{ gap: theme.space.xs }}>
          <Text style={{ color: theme.color.text1, fontSize: theme.text.body }}>
            {port.project || port.processName || port.host}:{port.port}
          </Text>
          <Text style={{ color: theme.color.text3, fontSize: theme.text.meta }}>
            {port.protocol} · {port.host}
            {port.processName ? ` · ${port.processName}` : ''}
          </Text>
        </View>
      ))}
      {!loading && !error && scan.ports.length === 0 && !scan.unavailableReason ? (
        <MobileStateView
          title={t('deck.ports.empty.title', 'No listening ports')}
          message={t(
            'deck.ports.empty.body',
            'Start a development server in a workspace to see it here.'
          )}
        />
      ) : null}
      {loading && scan.ports.length === 0 ? (
        <MobileStateView loading title={t('deck.ports.loading', 'Scanning ports…')} />
      ) : null}
    </View>
  )
}

export function DeckPorts(): ReactNode {
  const t = useMobileTranslation()
  const data = useDeckHostData()
  if (data.error) {
    return (
      <MobileStateView title={t('deck.ports.error', 'Couldn’t scan ports')} message={data.error} />
    )
  }
  if (!data.hostCatalogLoaded) {
    return <MobileStateView loading title={t('deck.ports.loading', 'Scanning ports…')} />
  }
  if (data.hosts.length === 0) {
    return (
      <MobileStateView
        title={t('deck.ports.noHosts.title', 'No paired desktops')}
        message={t('deck.ports.noHosts.body', 'Pair a desktop in Orca to scan its workspaces.')}
      />
    )
  }
  return (
    <ScrollView>
      {data.hosts.map((host) => (
        <DeckHostPorts key={host.id} data={data} hostId={host.id} />
      ))}
    </ScrollView>
  )
}
