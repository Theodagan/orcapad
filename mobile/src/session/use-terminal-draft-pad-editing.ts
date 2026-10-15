import { useState } from 'react'
import type { NativeSyntheticEvent, TextInputSelectionChangeEventData } from 'react-native'
import { useComposerEditBinding } from '../gamepad/bindings/use-composer-edit-binding'
import { useComposerSendBinding } from '../gamepad/bindings/use-composer-send-binding'
import { useControllerBinding } from '../gamepad/controller-provider'
import { FOCUS_PRIORITY } from '../gamepad/focus/focus-zones'
import {
  deleteWordBefore,
  moveCaretHorizontally,
  moveCaretVertically
} from './composer-text-editing'

/**
 * The terminal command field edited by pad, as the chat's composer is (`005` USE-R17). The draft is
 * local until sent, so the D-pad, `B` and `A` must edit and send it rather than reach the terminal
 * behind it. A touch, or the wheel's Keyboard, hands over to the real input until it blurs.
 */
export function useTerminalDraftPadEditing(args: {
  readonly handle: string | null
  readonly draft: string
  readonly setDraft: (draft: string) => void
  readonly caret: number
  readonly setCaret: (caret: number) => void
  /** The buffered field is the one on screen and shown. */
  readonly available: boolean
  readonly canSend: boolean
  readonly onSend: () => void
  readonly keyboardRequested: boolean
}): {
  readonly caretMode: boolean
  readonly beginTouchEditing: () => void
  readonly endTouchEditing: () => void
  readonly selection: { start: number; end: number } | undefined
  readonly onSelectionChange:
    | ((event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => void)
    | undefined
} {
  const { handle, draft, setDraft, caret, setCaret, available, keyboardRequested } = args
  const { connected: padAttached } = useControllerBinding()
  const [touchEditing, setTouchEditing] = useState(false)
  // Drives the native caret to where the pad left it once, then lets the input own it again.
  const [pendingSelection, setPendingSelection] = useState<{
    start: number
    end: number
  } | null>(null)
  const beginTouchEditing = (): void => {
    setPendingSelection({ start: caret, end: caret })
    setTouchEditing(true)
  }
  const [seenKeyboardRequest, setSeenKeyboardRequest] = useState(keyboardRequested)
  if (seenKeyboardRequest !== keyboardRequested) {
    setSeenKeyboardRequest(keyboardRequested)
    if (keyboardRequested) {
      beginTouchEditing()
    }
  }

  const caretMode = padAttached && !touchEditing
  const padEditing = caretMode && available && handle !== null && draft.length > 0
  const key = `terminal-draft:${handle ?? 'none'}`

  useComposerEditBinding({
    composerKey: key,
    active: padEditing,
    onMoveHorizontal: (direction) => setCaret(moveCaretHorizontally(draft, caret, direction)),
    onMoveVertical: (direction) => setCaret(moveCaretVertically(draft, caret, direction)),
    onDeleteWord: () => {
      const edit = deleteWordBefore(draft, caret)
      if (edit !== null) {
        setDraft(edit.text)
        setCaret(edit.caret)
      }
      // Never declined: the next answer to `B` is the terminal's Ctrl+W, which would edit its prompt.
      return true
    }
  })
  useComposerSendBinding({
    composerKey: key,
    canSend: padEditing && args.canSend && draft.trim().length > 0,
    onSend: args.onSend,
    // Above the terminal's own `A`, which would send Enter to the agent and leave the draft behind.
    priority: FOCUS_PRIORITY.card
  })

  return {
    caretMode,
    beginTouchEditing,
    endTouchEditing: () => setTouchEditing(false),
    selection: pendingSelection ?? undefined,
    // Touch-only use keeps the field uncontrolled, exactly as before (USE-R13).
    onSelectionChange: padAttached
      ? (event) => {
          setCaret(event.nativeEvent.selection.end)
          setPendingSelection(null)
        }
      : undefined
  }
}
