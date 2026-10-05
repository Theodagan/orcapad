import { useEffect, useMemo } from 'react'
import { AGENT_WHEEL_ACTION_IDS } from '../gamepad/bindings/agent-wheel-action-ids'
import { NAVIGATION_WHEEL_ACTION_IDS } from '../gamepad/bindings/navigation-wheel-actions'
import { useWheelActions } from '../gamepad/bindings/use-wheel-actions'
import { useInputVisibility } from '../gamepad/input-visibility/use-input-visibility'
import { useSessionChrome } from '../gamepad/session-chrome/use-session-chrome'
import type { WheelBinding } from '../gamepad/wheel/wheel-registry'
import { loadMobileNewTabAgentOptions } from './mobile-new-tab-agent-loader'
import { resolveMobileNativeChat } from './mobile-native-chat-eligibility'
import { resolveMobileTerminalTabAgentId } from './mobile-terminal-tab-agent'
import { agentMenuEntries } from './session-wheel-menus'
import type { MobileSessionController } from './use-mobile-session-controller'

/**
 * What the right wheel can do from a session (`005` USE-R10). Each one is a path the session
 * already has: the tab's own close, the new-tab drawer's agent launch, the tab menu's switch
 * between chat and terminal. The wheel only names them, and lists the agents they act on.
 *
 * Stopping is not here: it belongs to the surface that can stop, which is the chat or the
 * terminal in front of you.
 */
export function useSessionWheelActions(controller: MobileSessionController): void {
  const {
    client,
    worktreeId,
    connState,
    activeSessionTab,
    showNativeChat,
    nativeChatTranscriptIsLocalReadable,
    toggleTabChatView,
    handleCloseSessionTab,
    handleCreateTerminal
  } = controller
  const connected = connState === 'connected' && client !== null
  const input = useInputVisibility()
  const chrome = useSessionChrome()
  const resetChrome = chrome.reset
  // Focus mode and the hidden shortcuts belong to the session: they end when it does.
  useEffect(() => resetChrome, [resetChrome])

  const bindings = useMemo<readonly WheelBinding[]>(() => {
    const isAgent =
      activeSessionTab !== null &&
      (activeSessionTab.type === 'agent-session' ||
        (activeSessionTab.type === 'terminal' &&
          resolveMobileTerminalTabAgentId(activeSessionTab) !== null))
    const availability = connected ? ('available' as const) : ('unavailable' as const)

    return [
      {
        id: AGENT_WHEEL_ACTION_IDS.close,
        label: 'Close agent',
        availability: isAgent && connected ? 'available' : 'unavailable',
        run: () => {
          if (activeSessionTab !== null) {
            void handleCloseSessionTab(activeSessionTab)
          }
        }
      },
      {
        id: AGENT_WHEEL_ACTION_IDS.launch,
        label: 'Launch agent',
        availability,
        menu: async () => {
          if (client === null) {
            return []
          }
          const options = await loadMobileNewTabAgentOptions({ client, worktreeId })
          return agentMenuEntries(options, (agent) => void handleCreateTerminal(agent))
        }
      },
      {
        id: AGENT_WHEEL_ACTION_IDS.toggleView,
        // Says where it goes, not where you are.
        label: showNativeChat ? 'Terminal view' : 'Chat view',
        // A structured agent session has no terminal to go back to, and a plain terminal has no chat.
        availability:
          activeSessionTab?.type === 'terminal' &&
          resolveMobileNativeChat(activeSessionTab, nativeChatTranscriptIsLocalReadable) !== null
            ? 'available'
            : 'unavailable',
        run: () => {
          if (activeSessionTab !== null) {
            toggleTabChatView(activeSessionTab.id)
          }
        }
      },
      {
        id: AGENT_WHEEL_ACTION_IDS.toggleInput,
        label: input.visible ? 'Hide input' : 'Show input',
        availability: 'available',
        run: input.toggle
      },
      {
        id: NAVIGATION_WHEEL_ACTION_IDS.focusMode,
        label: chrome.focusMode ? 'Exit focus mode' : 'Focus mode',
        availability: 'available',
        run: chrome.toggleFocusMode
      },
      {
        id: NAVIGATION_WHEEL_ACTION_IDS.shortcuts,
        label: chrome.shortcutsHidden ? 'Show shortcuts' : 'Hide shortcuts',
        availability: 'available',
        run: chrome.toggleShortcuts
      }
    ]
  }, [
    client,
    worktreeId,
    connected,
    activeSessionTab,
    showNativeChat,
    nativeChatTranscriptIsLocalReadable,
    toggleTabChatView,
    input.visible,
    input.toggle,
    chrome.focusMode,
    chrome.shortcutsHidden,
    chrome.toggleFocusMode,
    chrome.toggleShortcuts,
    handleCloseSessionTab,
    handleCreateTerminal
  ])

  useWheelActions(bindings)
}
