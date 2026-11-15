import { useEffect, type ReactNode } from 'react'
import { useWindowDimensions } from 'react-native'
import { useLocalSearchParams, usePathname, useRouter } from 'expo-router'
import { MobileStateView } from '../../components/MobileStateView'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { getMobileSessionTabTitle } from '../../terminal/session/mobile-terminal-tab-agent'
import { useMobileSessionController } from '../../session/use-mobile-session-controller'
import { DeckTranscript } from './DeckTranscript'
import { DeckTerminal } from './DeckTerminal'
import { DeckShell } from '../DeckShell'
import { DeckHeader, type DeckSessionView } from '../chrome/DeckHeader'
import { deckRouteFromRouter, resolveDeckContext } from '../context/deck-context'
import { destinationById } from '../navigation/destinations'
import { PanelColumns } from '../panels/PanelColumns'
import { AllOpen, type DeckOpenItem } from '../panels/left/AllOpen'
import { QuickMenu } from '../panels/left/QuickMenu'
import type { DeckPanel } from '../panels/panel-registry'

export function DeckSession(): ReactNode {
  const t = useMobileTranslation()
  const router = useRouter()
  const { width } = useWindowDimensions()
  const controller = useMobileSessionController()
  const context = resolveDeckContext(deckRouteFromRouter(usePathname(), useLocalSearchParams()))
  const items = controller.visibleTabs
  useEffect(() => {
    if (!context.sessionId) {
      return
    }
    const requested = items.find(
      (tab) =>
        tab.id === context.sessionId ||
        (tab.type === 'terminal' && tab.terminal === context.sessionId) ||
        (tab.type === 'agent-session' && tab.sessionId === context.sessionId)
    )
    if (requested && requested.id !== controller.activeSessionTabId) {
      controller.switchSessionTab(requested)
    }
  }, [context.sessionId, controller.activeSessionTabId, controller.switchSessionTab, items])
  const active = controller.activeSessionTab ?? items[0] ?? null
  const view: DeckSessionView =
    active && controller.nativeChatController.isTabChatView(active.id) ? 'chat' : 'tui'
  const workspaceRoute = `/deck/w/${encodeURIComponent(controller.hostId)}/${encodeURIComponent(controller.worktreeId)}`
  const sessionRoute = active
    ? `/deck/s/${encodeURIComponent(controller.hostId)}/${encodeURIComponent(controller.worktreeId)}?sessionId=${encodeURIComponent(active.id)}`
    : workspaceRoute
  const openItems: readonly DeckOpenItem[] = [
    {
      id: controller.worktreeId,
      titleKey: 'deck.panel.items',
      title: controller.worktreeName,
      route: workspaceRoute
    },
    ...(active
      ? [
          {
            id: active.id,
            titleKey: 'deck.panel.sessionLog',
            title: getMobileSessionTabTitle(active),
            route: sessionRoute
          }
        ]
      : [])
  ]
  const renderPanel = (panel: DeckPanel): ReactNode | undefined => {
    if (panel.id === 'quick-menu') {
      return <QuickMenu current={null} onOpen={(id) => router.push(destinationById(id).route)} />
    }
    if (panel.id === 'all-open') {
      return (
        <AllOpen
          items={openItems}
          currentId={active?.id ?? controller.worktreeId}
          onOpen={(item) => router.push(item.route)}
        />
      )
    }
    return null
  }
  return (
    <DeckShell>
      <DeckHeader
        context={context}
        names={{
          host: controller.hostId,
          project: context.projectId,
          workspace: controller.worktreeName,
          session: active ? getMobileSessionTabTitle(active) : null
        }}
        items={items.map((tab) => ({
          id: tab.id,
          titleKey: 'deck.panel.items',
          title: getMobileSessionTabTitle(tab)
        }))}
        selectedItemId={active?.id ?? null}
        onSelectItem={(id) => {
          const tab = items.find((candidate) => candidate.id === id)
          if (tab) {
            controller.switchSessionTab(tab)
          }
        }}
        onCrumbPress={(crumb) => {
          if (crumb.kind === 'workspace') {
            router.push(workspaceRoute)
          } else if (crumb.kind !== 'session') {
            router.push('/deck/projects')
          }
        }}
        view={view}
        onViewChange={(next) => {
          if (active) {
            controller.nativeChatController.setTabView(
              active.id,
              next === 'chat' ? 'chat' : 'terminal'
            )
          }
        }}
      />
      <PanelColumns screen="session" windowWidth={width} renderPanel={renderPanel}>
        {!controller.terminalsLoaded ? (
          <MobileStateView loading title={t('deck.session.loading', 'Loading session…')} />
        ) : active === null ? (
          <MobileStateView
            title={t('deck.session.empty.title', 'No session items')}
            message={t(
              'deck.session.empty.body',
              'Start an agent in this workspace to open its session here.'
            )}
          />
        ) : view === 'chat' ? (
          <DeckTranscript controller={controller.nativeChatController} />
        ) : (
          <DeckTerminal controller={controller} />
        )}
      </PanelColumns>
    </DeckShell>
  )
}
