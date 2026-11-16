import { useMemo, useState, type ReactNode } from 'react'
import { Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { NewWorktreeModalController } from '../../components/NewWorktreeModalController'
import { useHostLabelById } from '../../new-workspace/use-host-label-by-id'
import { useHostWorktreeRows } from '../../new-workspace/use-host-worktree-rows'
import { workspaceRouteHref } from '../../navigation/workspace-execution-host'
import { openExternalLink } from '../../platform/external-link'
import { useHostClient } from '../../transport/connection/host-client-hooks'
import { useHostStatusGates } from '../../transport/connection/host-status-gates'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { FocusableOrca } from '../focus/focusable-orca'
import { disabledReasonText } from '../host/disabled-reason'
import { useDeckTheme } from '../theme/deck-theme'

export function DeckCreateWorkspace({
  hostId,
  order
}: {
  hostId: string
  order: number
}): ReactNode {
  const t = useMobileTranslation()
  const theme = useDeckTheme()
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const { client, state } = useHostClient(hostId)
  const gates = useHostStatusGates({ hostId, client, connState: state })
  const connected = state === 'connected'
  const worktrees = useHostWorktreeRows(client, connected, hostId)
  const hostLabelById = useHostLabelById(client, connected, hostId)
  const existingWorktreePaths = useMemo(
    () => worktrees.map((worktree) => worktree.path),
    [worktrees]
  )
  return (
    <View>
      <FocusableOrca
        zone="list"
        id={`create-workspace:${hostId}`}
        order={order}
        disabled={!connected}
        onActivate={() => setVisible(true)}
        accessibilityLabel={t('deck.projects.create', 'Create workspace')}
      >
        <Text
          style={{
            color: connected ? theme.color.accent : theme.color.text3,
            fontSize: theme.text.body,
            padding: theme.space.md
          }}
        >
          {t('deck.projects.create', 'Create workspace')}
        </Text>
      </FocusableOrca>
      {!connected ? (
        <Text
          style={{
            color: theme.color.text3,
            fontSize: theme.text.meta,
            paddingHorizontal: theme.space.md
          }}
        >
          {disabledReasonText(t, 'not-connected')}
        </Text>
      ) : null}
      <NewWorktreeModalController
        visible={visible}
        client={client}
        hostCapabilities={gates.hostCapabilities}
        hostId={hostId}
        hostLabelById={hostLabelById}
        existingWorktreePaths={existingWorktreePaths}
        existingWorktrees={worktrees}
        openExternalUrl={openExternalLink}
        onCreated={(worktreeId, name, warning, executionHost) => {
          setVisible(false)
          const route = `/deck/w/${encodeURIComponent(hostId)}/${encodeURIComponent(worktreeId)}?name=${encodeURIComponent(name)}${warning ? `&warning=${encodeURIComponent(warning)}` : ''}`
          router.replace(workspaceRouteHref(route, executionHost))
        }}
        onClose={() => setVisible(false)}
      />
    </View>
  )
}
