import type { Dispatch, SetStateAction } from 'react'
import { useDraftCaret } from './use-draft-caret'

/** The chat composer's caret, named as the native-chat controller hands it to the view. */
export function useChatComposerCaret(
  scopeKey: string | null,
  text: string,
  setText: Dispatch<SetStateAction<string>>
) {
  const caret = useDraftCaret({ scopeKey, text, setText })
  return {
    chatComposerCaret: caret.caret,
    setChatComposerCaret: caret.setCaret,
    chatComposerCaretPlacement: caret.placement,
    insertChatDictation: caret.insertDictation
  }
}
