import { useEffect, useMemo, useRef } from 'react'
import { DO_ACTION_IDS, VIEW_ACTION_IDS } from '../gamepad/bindings/wheel-action-ids'
import { useWheelActions } from '../gamepad/bindings/use-wheel-actions'
import { useInputVisibility } from '../gamepad/input-visibility/use-input-visibility'
import { useSessionChrome } from '../gamepad/session-chrome/use-session-chrome'
import type { WheelBinding, WheelMenuEntry } from '../gamepad/wheel/wheel-registry'
import { loadMobileNewTabAgentOptions } from './mobile-new-tab-agent-loader'
import { resolveMobileNativeChat } from './mobile-native-chat-eligibility'
import { agentMenuEntries, terminalKeyMenuEntries } from './session-wheel-menus'
import type { MobileSessionController } from './use-mobile-session-controller'

/**
 * The DO wheel (`012`): what the right stick does to the tab in front of you, each over a path the
 * session already has. Stop is registered by the chat or terminal surface that can stop. Focus mode
 * is also registered on its own, so Select reaches it.
 */
/** If the keyboard has not come up this long after it was asked for, the strip stops waiting for it. */
const KEYBOARD_REQUEST_PATIENCE_MS = 4000

export function useSessionDoWheelActions(controller: MobileSessionController): void {
  const {
    client,
    worktreeId,
    connState,
    activeSessionTab,
    showNativeChat,
    nativeChatTranscriptIsLocalReadable,
    keyboardLift,
    canPaste
  } = controller
  // The session's handlers are rebuilt each render; read them at run time, not as dependencies.
  const live = useRef(controller)
  live.current = controller
  const connected = connState === 'connected' && client !== null
  const input = useInputVisibility()
  const { endTyping, reset: resetInput } = input
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
  // So is the wheel's say over the text strip, and any keyboard request still pending.
  useEffect(() => resetInput, [resetInput])

  const bindings = useMemo<readonly WheelBinding[]>(() => {
    const isTerminal = activeSessionTab?.type === 'terminal'
    // A terminal has its live input and an agent session its composer; a file or a page has no field.
    const canType = isTerminal || activeSessionTab?.type === 'agent-session'
    // A structured agent session has no terminal to go back to, and a plain terminal has no chat.
    const hasTwoViews =
      isTerminal &&
      resolveMobileNativeChat(activeSessionTab, nativeChatTranscriptIsLocalReadable) !== null

    const focusMode: WheelMenuEntry = {
      id: VIEW_ACTION_IDS.focusMode,
      label: chrome.focusMode ? 'Exit focus mode' : 'Focus mode',
      availability: 'available',
      run: chrome.toggleFocusMode
    }
    const chatTerminal: WheelMenuEntry = {
      id: VIEW_ACTION_IDS.chatTerminal,
      // Says where it goes, not where you are.
      label: showNativeChat ? 'Terminal view' : 'Chat view',
      availability: hasTwoViews ? 'available' : 'unavailable',
      run: () => {
        if (activeSessionTab !== null) {
          live.current.toggleTabChatView(activeSessionTab.id)
        }
      }
    }
    const viewEntries: readonly WheelMenuEntry[] = [
      chatTerminal,
      focusMode,
      {
        id: VIEW_ACTION_IDS.shortcuts,
        label: chrome.shortcutsHidden ? 'Show shortcuts' : 'Hide shortcuts',
        availability: 'available',
        run: chrome.toggleShortcuts
      },
      {
        id: VIEW_ACTION_IDS.input,
        label: input.visible ? 'Hide input' : 'Show input',
        availability: 'available',
        run: input.toggle
      }
    ]

    return [
      {
        id: DO_ACTION_IDS.launch,
        label: 'Launch agent',
        availability: connected ? 'available' : 'unavailable',
        reason: 'Not connected',
        menu: async () => {
          if (client === null) {
            return []
          }
          const options = await loadMobileNewTabAgentOptions({ client, worktreeId })
          return agentMenuEntries(options, (agent) => void live.current.handleCreateTerminal(agent))
        }
      },
      {
        id: DO_ACTION_IDS.keys,
        label: 'Keys',
        availability: isTerminal && connected ? 'available' : 'unavailable',
        reason: isTerminal ? 'Not connected' : 'Keys need a terminal',
        menu: () =>
          terminalKeyMenuEntries(
            (bytes) => void live.current.handleAccessoryKey({ bytes }),
            canPaste ? () => void live.current.handlePaste() : null
          )
      },
      {
        id: DO_ACTION_IDS.close,
        label: 'Close tab',
        availability: activeSessionTab !== null && connected ? 'available' : 'unavailable',
        reason: activeSessionTab === null ? 'No tab open' : 'Not connected',
        run: () => {
          if (activeSessionTab !== null) {
            void live.current.handleCloseSessionTab(activeSessionTab)
          }
        }
      },
      {
        id: DO_ACTION_IDS.keyboard,
        // The on-screen keyboard for the field in front of you, for words the dictation gets wrong.
        label: keyboardUp ? 'Hide keyboard' : 'Keyboard',
        availability: canType ? 'available' : 'unavailable',
        reason: 'Nothing to type in',
        run: () => (keyboardUp ? live.current.dismissSoftwareKeyboard() : input.beginTyping())
      },
      {
        id: DO_ACTION_IDS.view,
        label: 'View',
        availability: 'available',
        menu: () => viewEntries
      },
      // Top level too, so Select runs the same toggle the View ▸ entry does.
      focusMode,
      // And on GO's top slot, the same toggle as View ▸ Chat/Terminal.
      { ...chatTerminal, reason: 'This tab has only one view' }
    ]
  }, [
    client,
    worktreeId,
    connected,
    activeSessionTab,
    showNativeChat,
    nativeChatTranscriptIsLocalReadable,
    canPaste,
    input.visible,
    input.toggle,
    input.beginTyping,
    keyboardUp,
    chrome.focusMode,
    chrome.shortcutsHidden,
    chrome.toggleFocusMode,
    chrome.toggleShortcuts
  ])

  useWheelActions(bindings)
}
