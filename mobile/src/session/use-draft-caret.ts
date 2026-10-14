import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction
} from 'react'
import { useControllerBinding } from '../gamepad/controller-provider'
import { clampCaret, insertDictation as insertDictationAt } from './composer-text-editing'

/**
 * Where the caret is in each draft: a chat's composer or a terminal's command field. It lives above
 * the field, next to the draft it points into, because the things that move it are not all the
 * field's: the D-pad edits it and dictation inserts at it, and a field that is hidden or remounted
 * must not lose its place.
 *
 * A draft nobody has moved the caret in has it at the end, which is where words have always been
 * appended, so nothing changes for a user who never touches it.
 */
export function useDraftCaret(args: {
  /** Which draft the caret belongs to; null while there is none. */
  scopeKey: string | null
  text: string
  setText: Dispatch<SetStateAction<string>>
}): {
  caret: number
  setCaret: (caret: number) => void
  /** Sets a dictated phrase into the draft at the caret, and leaves the caret after it. */
  insertDictation: (transcript: string) => void
  /** Bumps when dictation placed the caret, so a keyboard input knows to follow it once. */
  placement: number
} {
  const { scopeKey, text, setText } = args
  const { connected: padAttached } = useControllerBinding()
  const [carets, setCarets] = useState<Record<string, number>>({})
  const [placement, setPlacement] = useState(0)
  // Where the last dictation left the caret, keyed by the text it produced: the text arrives through
  // a functional update, so the caret can only be claimed once that text renders.
  const placedRef = useRef<{ scopeKey: string; text: string; caret: number } | null>(null)
  const placed = placedRef.current
  const pendingPlacement =
    placed !== null && placed.scopeKey === scopeKey && placed.text === text ? placed.caret : null
  const caret =
    scopeKey === null ? 0 : clampCaret(text, pendingPlacement ?? carets[scopeKey] ?? text.length)
  const latest = useRef({ text, caret })
  useLayoutEffect(() => {
    latest.current = { text, caret }
  })

  useLayoutEffect(() => {
    const claimed = placedRef.current
    if (claimed === null || claimed.scopeKey !== scopeKey || claimed.text !== text) {
      return
    }
    placedRef.current = null
    setCarets((previous) => ({ ...previous, [claimed.scopeKey]: claimed.caret }))
    setPlacement((count) => count + 1)
  }, [scopeKey, text])

  // A sent draft forgets where its caret was, so the next one starts at its end.
  useEffect(() => {
    if (scopeKey !== null && text === '') {
      setCarets((previous) => {
        if (!(scopeKey in previous)) {
          return previous
        }
        const { [scopeKey]: _forgotten, ...rest } = previous
        return rest
      })
    }
  }, [scopeKey, text])

  const setCaret = useCallback(
    (next: number) => {
      if (scopeKey === null) {
        return
      }
      setCarets((previous) =>
        previous[scopeKey] === next ? previous : { ...previous, [scopeKey]: next }
      )
    },
    [scopeKey]
  )

  const insertDictation = useCallback(
    (transcript: string) => {
      if (scopeKey === null) {
        return
      }
      // Functional, so words dictated before the last edit rendered are not built on a stale draft.
      setText((current) => {
        const pending = placedRef.current
        const at =
          pending !== null && pending.scopeKey === scopeKey && pending.text === current
            ? pending.caret
            : latest.current.text === current
              ? latest.current.caret
              : current.length
        // Without a pad nobody can have placed the caret on purpose, so words go where they always did.
        const edit = insertDictationAt(current, padAttached ? at : current.length, transcript)
        placedRef.current = { scopeKey, text: edit.text, caret: edit.caret }
        return edit.text
      })
    },
    [scopeKey, setText, padAttached]
  )

  return { caret, setCaret, insertDictation, placement }
}
