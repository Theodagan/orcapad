import { useEffect, useState, type RefObject } from 'react'
import type { AskPrompt } from '../../../src/shared/native-chat-ask'
import { cursorForQuestion, movePromptCursor } from '../gamepad/bindings/agent-prompt-selection'
import { usePromptOptionBinding } from '../gamepad/bindings/use-prompt-option-binding'
import { useControllerBinding } from '../gamepad/controller-provider'

/**
 * Controller edge of the Ask card (`004` LOOP-T3). Every call is one the card's own buttons make,
 * so the pad answers the prompt the same way a thumb does. Returns the option the cursor is on, or
 * null without a pad.
 */
export function useAskControllerCursor(args: {
  prompt: AskPrompt
  index: number
  selections: readonly (readonly number[])[]
  toggle: (qi: number, optIndex: number, multi: boolean) => void
  advance: (() => void) | undefined
  setIndex: (update: (i: number) => number) => void
  submittingRef: RefObject<boolean>
  onCancel?: () => unknown
}): number | null {
  const { prompt, index, selections, toggle, advance, setIndex, submittingRef, onCancel } = args
  const { connected } = useControllerBinding()
  const [cursor, setCursor] = useState(0)
  const optionCount = prompt.questions[index]?.options.length ?? 0
  usePromptOptionBinding({
    promptKey: `ask:${index}`,
    optionCount,
    onMove: (direction) => setCursor((held) => movePromptCursor(held, optionCount, direction)),
    onChoose: () => toggle(index, cursor, prompt.questions[index]?.multiSelect === true),
    onAdvance: advance,
    onRetreat: index > 0 ? () => setIndex((i) => Math.max(i - 1, 0)) : undefined,
    onCancel: () => {
      if (!submittingRef.current && onCancel) {
        void onCancel()
      }
    }
  })

  // Follow the answer already given rather than snapping to the top: the user is reviewing a
  // choice they made, and hiding it would be the wrong help.
  useEffect(() => {
    setCursor(cursorForQuestion(selections[index] ?? []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  return connected ? cursor : null
}
