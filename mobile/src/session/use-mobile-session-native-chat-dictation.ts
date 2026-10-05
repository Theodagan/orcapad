import { useEffect, useCallback } from 'react'
import { useFocusEffect } from 'expo-router'
import { useMobileDictation } from '../hooks/use-mobile-dictation'
import { useDictationBinding } from '../gamepad/bindings/use-dictation-binding'
import { dictationActivityOf } from '../gamepad/bindings/dictation-activity'
import { triggerError } from '../platform/haptics'
import {
  appendBufferedDictation,
  routeDictationTranscript
} from '../terminal/terminal-live-dictation-routing'
import {
  fetchDictationSetup,
  isDictationSetupRequiredError
} from '../dictation/mobile-dictation-setup'
import { useMobileNativeChatController } from './use-mobile-native-chat-controller'
import { useMobileNativeChatReadability } from './use-mobile-native-chat-readability'
import { useMobileNativeChatInputLease } from './use-mobile-native-chat-input-lease'
import { useMobileNativeChatSendError } from './use-mobile-native-chat-send-error'
import { mobileNativeChatScopeKey } from './mobile-native-chat-scope-key'
import { useMobileSendCompletionGeneration } from './use-mobile-send-completion-generation'
import type { MobileSessionFeedbackCapabilitiesModel } from './use-mobile-session-feedback-capabilities'

export function useMobileSessionNativeChatDictation(
  scope: MobileSessionFeedbackCapabilitiesModel,
  sendLiveTerminalInput: (handle: string, bytes: string) => Promise<boolean>
) {
  const {
    hostId,
    worktreeId,
    client,
    connState,
    agentSessionPromptCancelSupported,
    setInput,
    liveInputTerminalHandles,
    activeHandle,
    activeSessionTabId,
    diffComments,
    diffCommentsRef,
    setShowDictationSetup,
    setDictationMode,
    deviceTokenRef,
    dictationRouteContextRef,
    activeHandleRef,
    activeSessionTab,
    flushPendingLiveInputBeforeExternalSend,
    canSend,
    liveInputEnabled,
    showToast,
    resetLiveInputFocus
  } = scope
  const nativeChatScopeKey = mobileNativeChatScopeKey(hostId, worktreeId, activeSessionTabId)
  const nativeChatSendError = useMobileNativeChatSendError({
    scopeKey: nativeChatScopeKey,
    showToast
  })
  const nativeChatTranscriptIsLocalReadable = useMobileNativeChatReadability(client, worktreeId)
  const {
    ready: nativeChatInputLeaseReady,
    readyRef: nativeChatInputLeaseReadyRef,
    lockReason: nativeChatInputLockReason,
    markReady: markNativeChatInputLeaseReady,
    clear: clearNativeChatInputLease
  } = useMobileNativeChatInputLease({
    activeHandle,
    connected: connState === 'connected'
  })
  const nativeChatController = useMobileNativeChatController({
    client,
    hostId,
    worktreeId,
    activeSessionTab,
    activeSessionTabId,
    activeHandleRef,
    deviceTokenRef,
    nativeChatTranscriptIsLocalReadable,
    nativeChatInputLeaseReady,
    connState,
    agentSessionPromptCancelSupported,
    onSendError: nativeChatSendError.show,
    onSendResolved: nativeChatSendError.clear
  })
  const { toggleTabChatView, showNativeChat, showNativeChatRef } = nativeChatController
  nativeChatSendError.bannerMountedRef.current = showNativeChat
  const nativeChatOverlayInputLockReason =
    activeSessionTab?.type === 'agent-session'
      ? connState === 'connected'
        ? null
        : 'disconnected'
      : nativeChatInputLockReason
  const routeKey = nativeChatScopeKey ?? `${hostId}\0${worktreeId}`
  const getSendCompletionGeneration = useMobileSendCompletionGeneration({
    onBlur: resetLiveInputFocus,
    surfaceKey: JSON.stringify([routeKey, activeHandle, showNativeChat, liveInputEnabled])
  })

  // Dictation needs somewhere for the words to land. A terminal that can take input is one; so is
  // an unlocked chat composer. A structured agent session has no terminal handle, so `canSend` is
  // false there and the mic was a silent no-op by touch and by pad until the chat counted too.
  const chatCanDictate =
    showNativeChat && connState === 'connected' && nativeChatOverlayInputLockReason == null
  const dictationEnabled = canSend || chatCanDictate

  const dictation = useMobileDictation({
    client,
    enabled: dictationEnabled,
    onTranscript: (text) => {
      // Why: dictation belongs to the visible composer — native chat consumes it locally, terminal mode keeps live-input routing.
      if (showNativeChatRef.current) {
        nativeChatController.insertChatDictation(text)
        showToast('Dictation inserted')
        return
      }
      // Live mode inserts the transcript into its PTY as text (no Return); buffered mode appends to the command field.
      const routeContext = dictationRouteContextRef.current
      dictationRouteContextRef.current = null
      const route = routeDictationTranscript(
        text,
        routeContext?.liveInputEnabled ?? liveInputEnabled
      )
      if (route.kind === 'live-insert') {
        const insertHandle = routeContext?.handle ?? activeHandleRef.current
        if (!insertHandle) {
          return
        }
        void (async () => {
          const flushedPendingInput = await flushPendingLiveInputBeforeExternalSend(insertHandle)
          if (!flushedPendingInput) {
            return
          }
          const sent = await sendLiveTerminalInput(insertHandle, route.text)
          if (sent) {
            showToast('Dictation inserted')
          }
        })()
        return
      }
      setInput((current) => appendBufferedDictation(current, route.text))
      showToast('Dictation inserted')
    },
    onError: (err) => {
      dictationRouteContextRef.current = null
      // Dictation not set up on desktop → open the setup sheet instead of a dead-end toast.
      if (isDictationSetupRequiredError(err.message)) {
        setShowDictationSetup(true)
        return
      }
      triggerError()
      showToast(err.message)
    }
  })

  const startDictation = useCallback(() => {
    const routeContext = activeHandle
      ? { handle: activeHandle, liveInputEnabled: liveInputTerminalHandles.has(activeHandle) }
      : null
    dictationRouteContextRef.current = routeContext
    void dictation.start().catch((err) => {
      if (dictationRouteContextRef.current === routeContext) {
        dictationRouteContextRef.current = null
      }
      const message = err instanceof Error ? err.message : String(err)
      // The same answer `onError` gives: not set up on the desktop opens the setup sheet.
      if (isDictationSetupRequiredError(message)) {
        setShowDictationSetup(true)
        return
      }
      triggerError()
      showToast(message)
    })
  }, [activeHandle, dictation, liveInputTerminalHandles, triggerError, showToast])

  const cancelDictation = useCallback(() => {
    dictationRouteContextRef.current = null
    void dictation.cancel()
  }, [dictation])

  // Toggle mode: one tap starts, the next stops; long-press cancels mid-record.
  const handleDictationToggle = useCallback(() => {
    if (dictation.isProcessing) {
      cancelDictation()
    } else if (dictation.isStarting) {
      // The start request is still settling; a second toggle is intentionally ignored.
    } else if (dictation.isRecording) {
      void dictation.stop()
    } else {
      startDictation()
    }
  }, [cancelDictation, dictation, startDictation])

  // Hold mode: press starts, release stops — like a walkie-talkie.
  const handleDictationPressIn = useCallback(() => {
    if (!dictation.isStarting && !dictation.isRecording && !dictation.isProcessing) {
      startDictation()
    }
  }, [dictation, startDictation])

  const handleDictationPressOut = useCallback(() => {
    if (dictation.isRecording) {
      void dictation.stop()
    } else if (dictation.isStarting) {
      // Released before recording began: cancel so we don't leave a live mic.
      cancelDictation()
    }
  }, [cancelDictation, dictation])

  // A tap of `Y` reaches the same toggle the mic button does (BIND-R6, BIND-AC6). Nothing about
  // the microphone is reimplemented here — the hook above still owns all of it. A press with
  // nowhere for the words to go is refused out loud, since a pad has no mic icon to look dead.
  const explainDictationUnavailable = useCallback(() => {
    triggerError()
    showToast(
      connState === 'connected'
        ? 'Dictation needs a terminal or chat tab'
        : 'Reconnect to use dictation',
      1800
    )
  }, [connState, showToast])
  useDictationBinding({
    activity: dictationActivityOf(dictation.status),
    toggle: handleDictationToggle,
    canStart: dictationEnabled,
    onUnavailable: explainDictationUnavailable
  })

  const refreshDictationMode = useCallback(async () => {
    if (!client) {
      return
    }
    try {
      const setup = await fetchDictationSetup(client)
      setDictationMode(setup.dictationMode)
    } catch {
      // Non-fatal: fall back to the default toggle behavior.
    }
  }, [client])

  // Re-read on focus so a Settings ▸ Voice dictation-mode change is reflected on return.
  useFocusEffect(
    useCallback(() => {
      void refreshDictationMode()
    }, [refreshDictationMode])
  )

  useEffect(() => {
    diffCommentsRef.current = diffComments
  }, [diffComments])
  return {
    nativeChatScopeKey,
    nativeChatSendError,
    nativeChatTranscriptIsLocalReadable,
    nativeChatInputLeaseReady,
    nativeChatInputLeaseReadyRef,
    nativeChatInputLockReason,
    nativeChatOverlayInputLockReason,
    markNativeChatInputLeaseReady,
    clearNativeChatInputLease,
    nativeChatController,
    getSendCompletionGeneration,
    toggleTabChatView,
    showNativeChat,
    showNativeChatRef,
    dictation,
    startDictation,
    cancelDictation,
    handleDictationToggle,
    handleDictationPressIn,
    handleDictationPressOut,
    refreshDictationMode
  }
}

export type MobileSessionNativeChatDictationModel = MobileSessionFeedbackCapabilitiesModel &
  ReturnType<typeof useMobileSessionNativeChatDictation>
