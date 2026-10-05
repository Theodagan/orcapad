import { useLayoutEffect, useMemo, useRef } from 'react'
import { DECLINED } from '../focus/focus-target'
import { FOCUS_PRIORITY } from '../focus/focus-zones'
import { focusTargetFor, type SurfaceBinding } from './surface-binding'
import { useSurfaceBinding } from './use-surface-binding'

/**
 * Editing a draft with the pad alone (`005` round 2): the D-pad moves a caret, `B` deletes the word
 * before it. This is what the arrows and `B` already mean in a terminal's prompt, so a draft in the
 * chat and a draft in a TUI answer to the same hands.
 *
 * Offered only while there is a draft to edit, and at a priority above the transcript's own D-pad
 * scroll, so the arrows go to the caret while words are being shaped and back to the transcript
 * the rest of the time. `B` steps aside when the caret has nothing before it, so a permission
 * prompt waiting for a "no" still gets it.
 */
export type ComposerEditBindingOptions = {
  /** Distinct per composer, so a different chat is a different registration. */
  readonly composerKey: string
  /** The draft is on screen for the pad to edit, and nothing more urgent has the D-pad. */
  readonly active: boolean
  readonly onMoveHorizontal: (direction: 'left' | 'right') => void
  readonly onMoveVertical: (direction: 'up' | 'down') => void
  /** Returns false when there was no word to delete. */
  readonly onDeleteWord: () => boolean
}

export function useComposerEditBinding(options: ComposerEditBindingOptions): void {
  const { composerKey, active } = options
  const latest = useRef(options)
  useLayoutEffect(() => {
    latest.current = options
  })

  const binding = useMemo<SurfaceBinding | null>(() => {
    if (!active) {
      return null
    }
    return {
      focusTarget: {
        ...focusTargetFor(`composer-edit:${composerKey}`, [
          [
            'move-horizontal',
            (intent) => {
              if (intent.kind === 'move-horizontal') {
                latest.current.onMoveHorizontal(intent.direction)
              }
            }
          ],
          [
            'move-selection',
            (intent) => {
              if (intent.kind === 'move-selection') {
                latest.current.onMoveVertical(intent.direction)
              }
            }
          ],
          ['back', () => (latest.current.onDeleteWord() ? undefined : DECLINED)]
        ]),
        zone: 'agent',
        priority: FOCUS_PRIORITY.card,
        labels: { 'move-horizontal': 'Caret', 'move-selection': 'Caret', back: 'Delete word' }
      },
      wheelActions: []
    }
  }, [composerKey, active])

  useSurfaceBinding(binding)
}
