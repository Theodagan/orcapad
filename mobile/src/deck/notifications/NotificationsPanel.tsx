import { useMemo, type ReactNode } from 'react'
import { Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { selectAgentsNeedingYou } from '../../agents/agent-list-rows'
import { TransientToast } from '../../components/TransientToast'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { FocusableOrca } from '../focus/focusable-orca'
import type { DeckHostData } from '../host/use-deck-host-data'
import { useDeckTheme } from '../theme/deck-theme'
import { useDeckNotifications } from './use-deck-notifications'

export function NotificationsPanel({ data }: { data: DeckHostData }): ReactNode {
  const t = useMobileTranslation()
  const theme = useDeckTheme()
  const router = useRouter()
  const { notifications, toastMessage } = useDeckNotifications(data)
  const needsYou = useMemo(() => selectAgentsNeedingYou(data.agentList), [data.agentList])
  return (
    <View style={{ padding: theme.space.md, gap: theme.space.sm }}>
      <Text style={{ color: theme.color.text1, fontSize: theme.text.title }}>
        {t('deck.notifications.title', 'Notifications')}
      </Text>
      {needsYou.map((row, index) => (
        <FocusableOrca
          key={row.key}
          zone="list"
          id={`needs-you:${row.key}`}
          order={index}
          onActivate={() =>
            router.push(
              `/deck/s/${encodeURIComponent(row.hostId)}/${encodeURIComponent(row.entry.worktreeId)}?sessionId=${encodeURIComponent(row.entry.agent.paneKey)}`
            )
          }
          accessibilityLabel={row.title}
        >
          <Text style={{ color: theme.color.need, fontSize: theme.text.body }}>{row.title}</Text>
        </FocusableOrca>
      ))}
      {notifications.map((notification, index) => (
        <FocusableOrca
          key={notification.id}
          zone="list"
          id={`notification:${notification.id}`}
          order={index}
          disabled={!notification.worktreeId}
          onActivate={() => {
            if (notification.worktreeId) {
              router.push(
                `/deck/s/${encodeURIComponent(notification.hostId)}/${encodeURIComponent(notification.worktreeId)}?sessionId=${encodeURIComponent(notification.paneKey ?? '')}`
              )
            }
          }}
          accessibilityLabel={notification.title}
        >
          <Text style={{ color: theme.color.text1, fontSize: theme.text.body }}>
            {notification.title}
          </Text>
          <Text style={{ color: theme.color.text3, fontSize: theme.text.meta }}>
            {notification.body}
          </Text>
        </FocusableOrca>
      ))}
      {needsYou.length === 0 && notifications.length === 0 ? (
        <Text style={{ color: theme.color.text3, fontSize: theme.text.meta }}>
          {t('deck.notifications.empty', 'No agent notifications or requests need attention.')}
        </Text>
      ) : null}
      <TransientToast message={toastMessage} bottomInset={0} />
    </View>
  )
}
