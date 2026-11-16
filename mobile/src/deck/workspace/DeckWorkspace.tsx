import { useMemo, type ReactNode } from 'react'
import { Text, View, useWindowDimensions } from 'react-native'
import { useLocalSearchParams, usePathname, useRouter } from 'expo-router'
import { MobileStateView } from '../../components/MobileStateView'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { getMobileSessionTabTitle } from '../../terminal/session/mobile-terminal-tab-agent'
import type { MobileSessionTab } from '../../session/tabs/mobile-session-tabs'
import { useMobileSessionController } from '../../session/use-mobile-session-controller'
import { DeckShell } from '../DeckShell'
import { DeckHeader } from '../chrome/DeckHeader'
import { deckRouteFromRouter, resolveDeckContext } from '../context/deck-context'
import { FocusableOrca } from '../focus/focusable-orca'
import { destinationById } from '../navigation/destinations'
import { PanelColumns } from '../panels/PanelColumns'
import { AllOpen, type DeckOpenItem } from '../panels/left/AllOpen'
import { QuickMenu } from '../panels/left/QuickMenu'
import type { DeckPanel } from '../panels/panel-registry'
import { useDeckTheme } from '../theme/deck-theme'

function isWorkspaceItem(tab: MobileSessionTab): boolean {
  return (
    tab.type !== 'terminal' ||
    tab.agentStatus !== undefined ||
    tab.launchAgent !== undefined ||
    tab.nativeChatIdentity !== undefined
  )
}

function itemDetail(tab: MobileSessionTab, workspaceName: string): string {
  if (tab.type === 'browser') {
    return tab.url
  }
  if (tab.type === 'file' || tab.type === 'markdown') {
    return tab.relativePath ?? tab.filePath
  }
  return workspaceName
}

export function DeckWorkspace(): ReactNode {
  const t = useMobileTranslation()
  const router = useRouter()
  const theme = useDeckTheme()
  const { width } = useWindowDimensions()
  const controller = useMobileSessionController()
  const context = resolveDeckContext(deckRouteFromRouter(usePathname(), useLocalSearchParams()))
  const items = useMemo(
    () => controller.sessionTabs.filter(isWorkspaceItem),
    [controller.sessionTabs]
  )
  const active = items.find((tab) => tab.id === controller.activeSessionTabId) ?? items[0] ?? null
  const selectItem = (id: string): void => {
    const tab = items.find((candidate) => candidate.id === id)
    if (tab) {
      controller.switchSessionTab(tab)
    }
  }
  const openSession = (tab: MobileSessionTab): void => {
    const sessionId = tab.type === 'agent-session' ? tab.sessionId : tab.id
    router.push(
      `/deck/s/${encodeURIComponent(controller.hostId)}/${encodeURIComponent(controller.worktreeId)}?sessionId=${encodeURIComponent(sessionId)}`
    )
  }
  const workspaceRoute = `/deck/w/${encodeURIComponent(controller.hostId)}/${encodeURIComponent(controller.worktreeId)}`
  const openItems: readonly DeckOpenItem[] = [
    {
      id: controller.worktreeId,
      titleKey: 'deck.panel.items',
      title: controller.worktreeName,
      route: workspaceRoute
    }
  ]
  const renderPanel = (panel: DeckPanel): ReactNode | undefined => {
    if (panel.id === 'quick-menu') {
      return <QuickMenu current={null} onOpen={(id) => router.push(destinationById(id).route)} />
    }
    if (panel.id === 'all-open') {
      return (
        <AllOpen
          items={openItems}
          currentId={controller.worktreeId}
          onOpen={(item) => router.push(item.route)}
        />
      )
    }
    if (panel.id === 'items') {
      return (
        <View style={{ gap: theme.space.xs }}>
          {items.map((tab, index) => (
            <FocusableOrca
              key={tab.id}
              zone="panels"
              id={`workspace-item:${tab.id}`}
              order={index}
              onActivate={() => selectItem(tab.id)}
              accessibilityLabel={getMobileSessionTabTitle(tab)}
            >
              <Text
                style={{
                  color: tab.id === active?.id ? theme.color.text1 : theme.color.text2,
                  fontSize: theme.text.body
                }}
              >
                {getMobileSessionTabTitle(tab)}
              </Text>
            </FocusableOrca>
          ))}
        </View>
      )
    }
    return undefined
  }
  return (
    <DeckShell>
      <DeckHeader
        context={context}
        names={{
          host: controller.hostId,
          project: null,
          workspace: controller.worktreeName,
          session: null
        }}
        items={items.map((tab) => ({
          id: tab.id,
          titleKey: 'deck.panel.items',
          title: getMobileSessionTabTitle(tab)
        }))}
        selectedItemId={active?.id ?? null}
        onSelectItem={selectItem}
        onCrumbPress={(crumb) => {
          if (crumb.kind !== 'workspace') {
            router.push('/deck/projects')
          }
        }}
      />
      <PanelColumns screen="workspace" windowWidth={width} renderPanel={renderPanel}>
        {!controller.terminalsLoaded ? (
          <MobileStateView loading title={t('deck.workspace.loading', 'Loading workspace…')} />
        ) : active === null ? (
          <MobileStateView
            title={t('deck.workspace.empty.title', 'No workspace items')}
            message={t(
              'deck.workspace.empty.body',
              'Start an agent or open a browser tab or file on the paired desktop.'
            )}
          />
        ) : (
          <View style={{ flex: 1 }}>
            <MobileStateView
              title={getMobileSessionTabTitle(active)}
              message={itemDetail(active, controller.worktreeName)}
            />
            {(active.type === 'terminal' || active.type === 'agent-session') && (
              <FocusableOrca
                zone="list"
                id="workspace-open-session"
                order={0}
                onActivate={() => openSession(active)}
                accessibilityLabel={t('deck.workspace.openSession', 'Open session')}
              >
                <Text
                  style={{
                    color: theme.color.accent,
                    fontSize: theme.text.body,
                    padding: theme.space.md
                  }}
                >
                  {t('deck.workspace.openSession', 'Open session')}
                </Text>
              </FocusableOrca>
            )}
          </View>
        )}
      </PanelColumns>
    </DeckShell>
  )
}
