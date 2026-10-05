import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native'
import { ArrowUp, ImagePlus, Mic, Square } from 'lucide-react-native'
import { colors, radii, spacing, typography } from '../theme/mobile-theme'
import { useComposerEditBinding } from '../gamepad/bindings/use-composer-edit-binding'
import { useComposerSendBinding } from '../gamepad/bindings/use-composer-send-binding'
import { useControllerBinding } from '../gamepad/controller-provider'
import { getVerifiedNativeChatCommands } from '../../../src/shared/native-chat-agent-profiles'
import { structuredSlashCommands } from '../../../src/shared/structured-agent-session-composer'
import type { AgentSessionConversationCommand } from '../../../src/shared/agent-session-conversation-command'
import {
  applyAutocomplete,
  detectAutocompleteTrigger,
  rankSlashCommandSuggestions,
  rankSuggestions
} from './mobile-native-chat-autocomplete'
import {
  composerSuggestionInsertText,
  MobileNativeChatComposerSuggestions,
  type ComposerSuggestion
} from './MobileNativeChatComposerSuggestions'
import {
  MobileNativeChatSessionOptionPickers,
  type MobileNativeChatSessionOptionPickersProps
} from './MobileNativeChatSessionOptionPickers'
import type { PendingNativeChatImage } from './mobile-native-chat-image-attachment'
import { MobileNativeChatComposerAttachments } from './MobileNativeChatComposerAttachments'
import { MobileNativeChatComposerCaretField } from './MobileNativeChatComposerCaretField'
import {
  deleteWordBefore,
  moveCaretHorizontally,
  moveCaretVertically
} from './composer-text-editing'

const NO_FILE_PATHS: string[] = []
const NO_ATTACHMENTS: PendingNativeChatImage[] = []

type Props = {
  structuredCommands?: readonly AgentSessionConversationCommand[]
  /** Controlled composer text — owned by the parent so dictation can write to it. */
  value: string
  onChangeText: (text: string) => void
  /** Where the caret is in `value`, owned above so dictation and the pad edit the same place. */
  caret: number
  onCaretChange: (caret: number) => void
  /** Something more urgent than the draft (a permission prompt) has the D-pad. */
  editSuspended?: boolean
  /** The wheel asked for the keyboard: hand over to the real input. */
  keyboardRequested?: boolean
  onSend: (text: string) => Promise<boolean>
  /** Changes whenever the route focuses a different chat composer surface. */
  sendSurfaceId: string
  /** Reads the retained route's focus generation without forcing a screen render. */
  getSendCompletionGeneration: () => number
  /** Reads user draft mutations owned above this renderable composer. */
  getComposerEditGeneration: () => number
  /** Active tab's agent — the slash autocomplete serves its command catalog. */
  agent?: string | null
  /** Model/session-option pickers shown in the composer action row; null when
   *  the agent has no session-option catalog. */
  sessionOptions?: MobileNativeChatSessionOptionPickersProps | null
  onAttachImage?: () => void
  /** Images picked-and-uploaded but not yet sent — shown as removable thumbnails
   *  and ridden along on the next send (desktop native-chat parity). */
  attachments?: PendingNativeChatImage[]
  onRemoveAttachment?: (id: string) => void
  isAttaching?: boolean
  onMicPress?: () => void
  micActive?: boolean
  /** Dictation trigger style — 'hold' uses press-in/out, 'toggle' uses tap. */
  dictationMode?: 'toggle' | 'hold'
  onMicPressIn?: () => void
  onMicPressOut?: () => void
  disabled?: boolean
  placeholder?: string
  filePaths?: string[]
  onNeedFiles?: (query: string) => void
}

export function MobileNativeChatComposer({
  value,
  onChangeText,
  caret: cursor,
  onCaretChange,
  editSuspended = false,
  keyboardRequested = false,
  onSend,
  sendSurfaceId,
  getSendCompletionGeneration,
  getComposerEditGeneration,
  agent,
  structuredCommands,
  sessionOptions,
  onAttachImage,
  attachments = NO_ATTACHMENTS,
  onRemoveAttachment,
  isAttaching = false,
  onMicPress,
  micActive = false,
  dictationMode = 'toggle',
  onMicPressIn,
  onMicPressOut,
  disabled = false,
  placeholder = 'Message, @files, /commands',
  filePaths = NO_FILE_PATHS,
  onNeedFiles
}: Props): React.JSX.Element {
  // With a pad attached the draft is drawn with a caret the D-pad moves, and the keyboard is the
  // exception: a touch on the draft hands over to the real input until it loses focus.
  const { connected: padAttached } = useControllerBinding()
  const [touchEditing, setTouchEditing] = useState(false)
  const caretMode = padAttached && !touchEditing
  const typingAt = useRef(cursor)
  typingAt.current = cursor
  const setCursor = onCaretChange
  // Transiently drives the native caret after a mid-text autocomplete insert,
  // then released on the next selection change so manual caret placement still
  // works (a permanently controlled `selection` breaks it in React Native).
  const [pendingSelection, setPendingSelection] = useState<{ start: number; end: number } | null>(
    null
  )
  // What the native input last said, so a caret moved from outside (dictation) can be told apart.
  const reportedCaretRef = useRef(cursor)
  useEffect(() => {
    if (!caretMode && cursor !== reportedCaretRef.current) {
      reportedCaretRef.current = cursor
      setPendingSelection({ start: cursor, end: cursor })
    }
  }, [caretMode, cursor])
  useEffect(() => {
    if (keyboardRequested) {
      setPendingSelection({ start: typingAt.current, end: typingAt.current })
      setTouchEditing(true)
    }
  }, [keyboardRequested])
  const sendingRef = useRef(false)
  const mountedRef = useRef(true)
  const sendSurfaceIdRef = useRef(sendSurfaceId)
  const sendSurfaceGenerationRef = useRef(0)
  useLayoutEffect(() => {
    if (sendSurfaceIdRef.current !== sendSurfaceId) {
      sendSurfaceIdRef.current = sendSurfaceId
      sendSurfaceGenerationRef.current += 1
    }
  }, [sendSurfaceId])
  const [sending, setSending] = useState(false)
  const trimmed = value.trim()
  const sessionOptionDispatching = sessionOptions?.controller.pendingId != null
  // An attached image alone is a valid send (desktop parity), so the image rides
  // along even when the user sends no accompanying text.
  const canSend =
    (trimmed.length > 0 || attachments.length > 0) &&
    !disabled &&
    !sending &&
    !isAttaching &&
    !sessionOptionDispatching

  // The suggestions are picked by touch, so a draft the pad is editing has none.
  const trigger = useMemo(
    () => (caretMode ? null : detectAutocompleteTrigger(value, cursor)),
    [caretMode, value, cursor]
  )
  const suggestions = useMemo<ComposerSuggestion[]>(() => {
    if (!trigger) {
      return []
    }
    if (trigger.kind === 'slash') {
      const commands =
        structuredCommands !== undefined
          ? structuredSlashCommands(structuredCommands, agent)
          : agent
            ? getVerifiedNativeChatCommands(agent)
            : []
      // Why: Codex's catalog is 45 commands and this list is a plain ScrollView
      // (~5 rows visible), so an uncapped `/` would mount every row and
      // re-reconcile them on each streaming tick right above the transcript.
      return rankSlashCommandSuggestions(commands, trigger.query, 12).map((command) => ({
        kind: 'command' as const,
        command
      }))
    }
    return rankSuggestions(filePaths, trigger.query).map((path) => ({
      kind: 'file' as const,
      path
    }))
  }, [trigger, filePaths, agent, structuredCommands])

  useEffect(() => {
    if (trigger?.kind === 'file') {
      onNeedFiles?.(trigger.query)
    }
  }, [onNeedFiles, trigger?.kind, trigger?.query])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      sendSurfaceGenerationRef.current += 1
    }
  }, [])

  const handleChange = (next: string): void => {
    onChangeText(next)
  }

  const pickSuggestion = (suggestion: ComposerSuggestion): void => {
    if (!trigger) {
      return
    }
    const { text: nextText, cursor: nextCursor } = applyAutocomplete(
      value,
      trigger,
      composerSuggestionInsertText(suggestion)
    )
    onChangeText(nextText)
    setCursor(nextCursor)
    setPendingSelection({ start: nextCursor, end: nextCursor })
  }

  const handleSend = async (): Promise<void> => {
    if (!canSend || sendingRef.current) {
      return
    }
    sendingRef.current = true
    setSending(true)
    const sendSurfaceGeneration = sendSurfaceGenerationRef.current
    const sendCompletionGeneration = getSendCompletionGeneration()
    const composerEditGeneration = getComposerEditGeneration()
    try {
      // Raw, not trimmed: the send seam owns the wire trim, and a rejection has
      // to hand the user back exactly what they typed (#14819).
      const accepted = await onSend(value)
      if (
        accepted &&
        mountedRef.current &&
        sendSurfaceGeneration === sendSurfaceGenerationRef.current &&
        sendCompletionGeneration === getSendCompletionGeneration() &&
        composerEditGeneration === getComposerEditGeneration()
      ) {
        setCursor(0)
        // Why: the turn is now the agent's — the keyboard would cover the reply.
        // A rejected send keeps it up so the handed-back draft stays editable.
        Keyboard.dismiss()
      }
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }

  // `A` sends the draft (`005` USE-R3); the composer's own `canSend` decides whether it may.
  useComposerSendBinding({ composerKey: sendSurfaceId, canSend, onSend: () => void handleSend() })
  // The D-pad moves the caret and `B` deletes a word, as in a terminal's prompt.
  useComposerEditBinding({
    composerKey: sendSurfaceId,
    active: caretMode && !editSuspended && value.length > 0,
    onMoveHorizontal: (direction) => setCursor(moveCaretHorizontally(value, cursor, direction)),
    onMoveVertical: (direction) => setCursor(moveCaretVertically(value, cursor, direction)),
    onDeleteWord: () => {
      const edit = deleteWordBefore(value, cursor)
      if (edit === null) {
        return false
      }
      onChangeText(edit.text)
      setCursor(edit.caret)
      return true
    }
  })

  return (
    <View>
      {suggestions.length > 0 ? (
        <MobileNativeChatComposerSuggestions suggestions={suggestions} onPick={pickSuggestion} />
      ) : null}
      <MobileNativeChatComposerAttachments
        attachments={attachments}
        onRemoveAttachment={onRemoveAttachment}
      />
      <View style={styles.composerInset} testID="native-chat-composer-inset">
        <View style={styles.bar} testID="native-chat-composer">
          {caretMode ? (
            <MobileNativeChatComposerCaretField
              value={value}
              caret={cursor}
              placeholder={placeholder}
              onPress={() => {
                setPendingSelection({ start: cursor, end: cursor })
                setTouchEditing(true)
              }}
            />
          ) : (
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={handleChange}
              autoFocus={touchEditing}
              // Not Android's fullscreen keyboard: in landscape it hides the screen being typed into.
              disableFullscreenUI
              onBlur={() => setTouchEditing(false)}
              // Controlled only transiently right after an autocomplete insert.
              selection={pendingSelection ?? undefined}
              onSelectionChange={(e) => {
                reportedCaretRef.current = e.nativeEvent.selection.end
                setCursor(e.nativeEvent.selection.end)
                setPendingSelection(null)
              }}
              placeholder={placeholder}
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.accentBlue}
              multiline
              // Why: never revoke `editable` — iOS resigns first responder on a focused
              // field, so a transient lock would yank the keyboard mid-typing (#10681).
              // The lock gates sending; the draft survives and rides the next send.
              textAlignVertical="top"
            />
          )}
          <View style={styles.actionRow} testID="native-chat-composer-actions">
            {onAttachImage ? (
              <Pressable
                accessibilityLabel="Attach image"
                style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                onPress={onAttachImage}
                disabled={isAttaching || disabled}
              >
                {isAttaching ? (
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                ) : (
                  <ImagePlus size={20} color={colors.textSecondary} strokeWidth={2} />
                )}
              </Pressable>
            ) : null}
            {sessionOptions ? (
              <MobileNativeChatSessionOptionPickers
                {...sessionOptions}
                sendInFlight={sending || isAttaching}
              />
            ) : null}
            <View style={styles.actionSpacer} />
            {onMicPress ? (
              <Pressable
                accessibilityLabel={micActive ? 'Stop dictation' : 'Dictate'}
                style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                // Hold mode is walkie-talkie (press-in/out); toggle mode taps.
                onPress={dictationMode === 'hold' ? undefined : onMicPress}
                onPressIn={dictationMode === 'hold' ? onMicPressIn : undefined}
                onPressOut={dictationMode === 'hold' ? onMicPressOut : undefined}
                disabled={disabled}
              >
                {micActive ? (
                  <Square
                    size={18}
                    color={colors.statusRed}
                    strokeWidth={2.4}
                    fill={colors.statusRed}
                  />
                ) : (
                  <Mic size={20} color={colors.textSecondary} strokeWidth={2} />
                )}
              </Pressable>
            ) : null}
            <Pressable
              accessibilityLabel="Send message"
              style={({ pressed }) => [
                styles.sendButton,
                !canSend && styles.sendButtonDisabled,
                pressed && canSend && styles.pressed
              ]}
              onPress={handleSend}
              disabled={!canSend}
            >
              <ArrowUp
                size={20}
                color={canSend ? colors.bgBase : colors.textMuted}
                strokeWidth={2.6}
              />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  composerInset: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md
  },
  bar: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    borderRadius: radii.card,
    backgroundColor: colors.bgPanel,
    overflow: 'hidden'
  },
  actionRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  actionSpacer: {
    flex: 1
  },
  input: {
    width: '100%',
    maxHeight: 140,
    minHeight: 40,
    color: colors.textPrimary,
    fontSize: typography.bodySize + 1,
    backgroundColor: colors.bgRaised,
    borderRadius: radii.input,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    // White send affordance per design — dark arrow on a light circle.
    backgroundColor: colors.textPrimary
  },
  sendButtonDisabled: {
    backgroundColor: colors.bgRaised
  },
  pressed: {
    opacity: 0.7
  }
})
