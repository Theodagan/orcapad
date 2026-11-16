import type { ReactNode } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { MobileStateView } from '../../components/MobileStateView'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { FocusableOrca } from '../focus/focusable-orca'
import { useDeckTheme } from '../theme/deck-theme'
import { useDeckApprovals } from './use-deck-approvals'

export function DeckApprovals(): ReactNode {
  const t = useMobileTranslation()
  const theme = useDeckTheme()
  const router = useRouter()
  const data = useDeckApprovals()
  if (data.error) {
    return (
      <MobileStateView
        title={t('deck.approvals.error', 'Couldn’t load approvals')}
        message={data.error}
      />
    )
  }
  if (data.loading && data.approvals.length === 0) {
    return <MobileStateView loading title={t('deck.approvals.loading', 'Loading approvals…')} />
  }
  if (data.approvals.length === 0) {
    return (
      <MobileStateView
        title={t('deck.approvals.empty.title', 'No approvals need you')}
        message={t(
          'deck.approvals.empty.body',
          'Permission requests and questions from live agents will appear here.'
        )}
      />
    )
  }
  return (
    <ScrollView>
      {data.hosts.map((host) => {
        const rows = data.approvals.filter((row) => row.hostId === host.id)
        if (rows.length === 0) {
          return null
        }
        return (
          <View key={host.id} style={{ padding: theme.space.md }}>
            <Text style={{ color: theme.color.text1, fontSize: theme.text.title }}>
              {host.name}
            </Text>
            {rows.map((row, index) => (
              <FocusableOrca
                key={row.key}
                zone="list"
                id={`approval:${row.key}`}
                order={index}
                onActivate={() =>
                  router.push(
                    `/deck/s/${encodeURIComponent(row.hostId)}/${encodeURIComponent(row.entry.worktreeId)}?sessionId=${encodeURIComponent(row.entry.agent.paneKey)}&projectId=${encodeURIComponent(row.entry.repo)}`
                  )
                }
                accessibilityLabel={row.title}
              >
                <View style={{ paddingVertical: theme.space.sm }}>
                  <Text style={{ color: theme.color.need, fontSize: theme.text.body }}>
                    {row.title}
                  </Text>
                  <Text style={{ color: theme.color.text3, fontSize: theme.text.meta }}>
                    {row.entry.workspaceName}
                  </Text>
                </View>
              </FocusableOrca>
            ))}
          </View>
        )
      })}
      <Text
        style={{ color: theme.color.text3, fontSize: theme.text.meta, padding: theme.space.md }}
      >
        {t('deck.approvals.documentation', 'Request documentation')} —{' '}
        {t(
          'deck.approvals.documentationReason',
          'Unavailable: Orca provides no documentation fields for prompts.'
        )}
      </Text>
    </ScrollView>
  )
}
