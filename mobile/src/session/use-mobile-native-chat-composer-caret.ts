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
import { clampCaret, insertDictation } from './composer-text-editing'

/**
 * Where the caret is in each chat's draft. It lives above the composer, next to the draft it
 * points into, because the things that move it are not all the composer's: the D-pad edits it and
 * dictation inserts at it, and a composer that is hidden or remounted must not lose its place.
 *
 * A draft nobody has moved the caret in has it at the end, which is where words have always been
 * appended, so nothing changes for a user who never touches it.
 */
export function useMobileNativeChatComposerCaret(args: {
  /** Which draft the caret belongs to; null while there is no chat tab. */
  scopeKey: string | null
  text: string
  setText: Dispatch<SetStateAction<string>>
}): {
  chatComposerCaret: number
  setChatComposerCaret: (caret: number) => void
  /** Sets a dictated phrase into the draft at the caret, and leaves the caret after it. */
  insertChatDictation: (transcript: string) => void
} {
  const { scopeKey, text, setText } = args
  const { connected: padAttached } = useControllerBinding()
  const [carets, setCarets] = useState<Record<string, number>>({})
  const caret = scopeKey === null ? 0 : clampCaret(text, carets[scopeKey] ?? text.length)
  const latest = useRef({ text, caret })
  useLayoutEffect(() => {
    latest.current = { text, caret }
  })

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

  const setChatComposerCaret = useCallback(
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

  const insertChatDictation = useCallback(
    (transcript: string) => {
      if (scopeKey === null) {
        return
      }
      // Without a pad nobody can have placed the caret on purpose, so words go where they always did.
      const { text: current, caret: placed } = latest.current
      const edit = insertDictation(current, padAttached ? placed : current.length, transcript)
      setText(edit.text)
      setCarets((previous) => ({ ...previous, [scopeKey]: edit.caret }))
    },
    [scopeKey, setText, padAttached]
  )

  return { chatComposerCaret: caret, setChatComposerCaret, insertChatDictation }
}
