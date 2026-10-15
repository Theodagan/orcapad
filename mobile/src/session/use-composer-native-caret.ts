import { useEffect, useRef, useState } from 'react'
import { useControllerBinding } from '../gamepad/controller-provider'
import { clampCaret } from './composer-text-editing'

type Selection = { start: number; end: number }

/**
 * Who holds the chat composer's caret, and when the keyboard input is told where it is. With a pad
 * the draft's owner holds it, so the D-pad and dictation edit the same place; without one only the
 * field reads it, so touch typing does not re-render the session. The native caret is driven only
 * on an explicit placement — a pad handover, an autocomplete insert, a dictated phrase — and then
 * released on the next selection change (a permanently controlled `selection` breaks touch).
 */
export function useComposerNativeCaret(args: {
  readonly value: string
  readonly caret: number
  readonly onCaretChange: (caret: number) => void
  /** Bumps when dictation placed the caret. */
  readonly caretPlacement: number
  readonly keyboardRequested: boolean
}): {
  readonly caretMode: boolean
  readonly touchEditing: boolean
  readonly cursor: number
  readonly setCursor: (caret: number) => void
  readonly selection: Selection | undefined
  readonly placeSelection: (at: number) => void
  readonly onNativeSelection: (end: number) => void
  readonly beginTouchEditing: () => void
  readonly endTouchEditing: () => void
  readonly forgetAfterSend: () => void
} {
  const { value, caret: ownerCaret, onCaretChange, caretPlacement, keyboardRequested } = args
  // With a pad attached the draft is drawn with a caret the D-pad moves, and the keyboard is the
  // exception: a touch on the draft hands over to the real input until it loses focus.
  const { connected: padAttached } = useControllerBinding()
  const [touchEditing, setTouchEditing] = useState(false)
  const caretMode = padAttached && !touchEditing
  const [localCaret, setLocalCaret] = useState<number | null>(null)
  const cursor = padAttached ? ownerCaret : clampCaret(value, localCaret ?? value.length)
  const setCursor = padAttached ? onCaretChange : setLocalCaret
  const [pendingSelection, setPendingSelection] = useState<Selection | null>(null)
  const placeSelection = (at: number): void => setPendingSelection({ start: at, end: at })

  // A pad arriving or leaving hands the caret between this field and the draft's owner.
  const caretOwnerPadRef = useRef(padAttached)
  useEffect(() => {
    if (caretOwnerPadRef.current === padAttached) {
      return
    }
    caretOwnerPadRef.current = padAttached
    if (!padAttached) {
      setLocalCaret(ownerCaret)
    } else if (localCaret !== null) {
      onCaretChange(clampCaret(value, localCaret))
    }
  }, [padAttached, ownerCaret, localCaret, onCaretChange, value])

  // Only dictation's placement drives the native caret here; clamp drift and sends never do.
  const seenPlacementRef = useRef(caretPlacement)
  useEffect(() => {
    if (seenPlacementRef.current === caretPlacement) {
      return
    }
    seenPlacementRef.current = caretPlacement
    if (!caretMode) {
      setLocalCaret(ownerCaret)
      setPendingSelection({ start: ownerCaret, end: ownerCaret })
    }
  }, [caretPlacement, caretMode, ownerCaret])

  // Only the wheel asks for the keyboard, so the caret it hands over is the pad's.
  const [seenKeyboardRequest, setSeenKeyboardRequest] = useState(false)
  if (seenKeyboardRequest !== keyboardRequested) {
    setSeenKeyboardRequest(keyboardRequested)
    if (keyboardRequested) {
      placeSelection(clampCaret(value, ownerCaret))
      setTouchEditing(true)
    }
  }

  return {
    caretMode,
    touchEditing,
    cursor,
    setCursor,
    selection: pendingSelection ?? undefined,
    placeSelection,
    onNativeSelection: (end) => {
      setCursor(end)
      setPendingSelection(null)
    },
    beginTouchEditing: () => {
      placeSelection(cursor)
      setTouchEditing(true)
    },
    endTouchEditing: () => setTouchEditing(false),
    forgetAfterSend: () => (padAttached ? onCaretChange(0) : setLocalCaret(null))
  }
}
