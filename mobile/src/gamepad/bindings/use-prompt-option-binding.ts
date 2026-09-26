import { useMemo } from 'react'
import { focusTargetFor, type IntentHandlerEntry } from './surface-binding'
import { useSurfaceBinding } from './use-surface-binding'

/**
 * A controller edge for whichever prompt card is on screen. Registered by the card itself, since
 * the card is the only thing that knows what is selected — and the focus registry gives a newly
 * mounted inner surface focus, so a prompt appearing takes the buttons from the chat beneath it
 * and gives them back when it closes.
 *
 * Every control here is one the card already draws a button for, so `A` and a tap answer the same
 * prompt the same way.
 */
export type PromptOptionBindingOptions = {
  /** Distinct per card instance, so a new prompt is a new mount rather than a re-render. */
  readonly promptKey: string
  readonly optionCount: number
  readonly onMove: (direction: 'up' | 'down') => void
  /** `A` on the cursor's option: select it, or toggle it where the card allows several. */
  readonly onChoose: () => void
  /** The card's Next/Send. Absent where the card has no step to advance to. */
  readonly onAdvance?: () => void
  /** The card's Back, for a multi-step prompt. */
  readonly onRetreat?: () => void
  readonly onCancel: () => void
}

export function usePromptOptionBinding(options: PromptOptionBindingOptions): void {
  const { promptKey, optionCount, onMove, onChoose, onAdvance, onRetreat, onCancel } = options

  const binding = useMemo(() => {
    const entries: IntentHandlerEntry[] = [
      [
        'move-selection',
        (intent) => {
          if (intent.kind === 'move-selection' && optionCount > 0) {
            onMove(intent.direction)
          }
        }
      ],
      ['back', onCancel]
    ]

    // An empty option list has nothing to choose, and `A` must not pretend otherwise.
    if (optionCount > 0) {
      entries.push(['confirm', onChoose])
    }

    if (onAdvance !== undefined || onRetreat !== undefined) {
      entries.push([
        'move-horizontal',
        (intent) => {
          if (intent.kind !== 'move-horizontal') {
            return
          }
          if (intent.direction === 'right') {
            onAdvance?.()
          } else {
            onRetreat?.()
          }
        }
      ])
    }

    return {
      // Above the chat view it sits inside: while a prompt is on screen it is what the buttons
      // are for.
      focusTarget: { ...focusTargetFor(`prompt:${promptKey}`, entries), priority: 2 },
      wheelActions: []
    }
  }, [promptKey, optionCount, onMove, onChoose, onAdvance, onRetreat, onCancel])

  useSurfaceBinding(binding)
}
