import { useEffect, useMemo, useRef } from 'react'
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
/** If the keyboard has not come up this long after it was asked for, the strip stops waiting for it. */
const KEYBOARD_REQUEST_PATIENCE_MS = 4000

export function useSessionWheelActions(controller: MobileSessionController): void {
  const {
    client,
    worktreeId,
    connState,
    activeSessionTab,
    showNativeChat,
    nativeChatTranscriptIsLocalReadable,
    toggleTabChatView,
    keyboardLift,
    dismissSoftwareKeyboard,
    handleCloseSessionTab,
    handleCreateTerminal
  } = controller
  const connected = connState === 'connected' && client !== null
  const input = useInputVisibility()
  const { endTyping } = input
  const keyboardUp = keyboardLift > 0
  // A request for the keyboard ends when it has come up and gone again, or when it never came.
  const keyboardWasUp = useRef(false)
  useEffect(() => {
    if (keyboardUp) {
      keyboardWasUp.current = true
      return
    }
    if (keyboardWasUp.current) {
      keyboardWasUp.current = false
      endTyping()
    }
  }, [keyboardUp, endTyping])
  useEffect(() => {
    if (!input.typing || keyboardUp) {
      return
    }
    const gaveUp = setTimeout(endTyping, KEYBOARD_REQUEST_PATIENCE_MS)
    return () => clearTimeout(gaveUp)
  }, [input.typing, keyboardUp, endTyping])
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
    // A terminal has its live input and an agent session its composer; a file or a page has no field.
    const canType =
      activeSessionTab?.type === 'terminal' || activeSessionTab?.type === 'agent-session'

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
        id: AGENT_WHEEL_ACTION_IDS.keyboard,
        // The on-screen keyboard for the field in front of you, for words the dictation gets wrong.
        label: keyboardUp ? 'Hide keyboard' : 'Keyboard',
        availability: canType ? 'available' : 'unavailable',
        run: () => (keyboardUp ? dismissSoftwareKeyboard() : input.beginTyping())
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
    input.beginTyping,
    keyboardUp,
    dismissSoftwareKeyboard,
    chrome.focusMode,
    chrome.shortcutsHidden,
    chrome.toggleFocusMode,
    chrome.toggleShortcuts,
    handleCloseSessionTab,
    handleCreateTerminal
  ])

  useWheelActions(bindings)
}
