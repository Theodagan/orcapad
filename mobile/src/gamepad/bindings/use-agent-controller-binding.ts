import { useLayoutEffect, useMemo, useRef } from 'react'
import { resolveAgentIntervention, type InterventionSurface } from './agent-intervention'
import { DO_ACTION_IDS, VIEW_ACTION_IDS } from './wheel-action-ids'
import { LIST_SCROLL_RATE } from './controller-scroll-rate'
import type { WheelActionBinding } from '../wheel/wheel-registry'
import { FOCUS_PRIORITY } from '../focus/focus-zones'
import { focusTargetFor, type IntentHandlerEntry, type SurfaceBinding } from './surface-binding'
import { useScrollIntentEntry } from './use-scroll-intent-entry'
import { useSurfaceBinding } from './use-surface-binding'

/**
 * The agent view's controller edge. Everything below is a callback the native chat already owns,
 * so a press and the equivalent tap reach the same intervention, the same stop and the same
 * transcript (BIND-R5, BIND-AC5).
 *
 * `A` and `B` are offered only while an intervention actually has an answer to give. With no
 * prompt on screen they are not accepted at all, rather than accepted and dropped — an intent
 * nothing answers falls through to whatever is behind it, and hints stay honest (`001` §7).
 *
 * Stop is a wheel action, run from DO or X+Select (`012`); the chat decides with `canStop` whether
 * a turn can be stopped, and the action below follows it. X+Y hides or shows the prompt card.
 */

/** One D-pad press moves the transcript about three lines, like an arrow key in a reader. */
const DPAD_SCROLL_STEP_POINTS = 72

export type AgentControllerBindingOptions = InterventionSurface & {
  /** The session this view belongs to, so a stop names the turn it is stopping (`003` §2). */
  readonly sessionId: string
  readonly canStop: boolean
  readonly onStop?: () => void
  /** X+L2/R2: the nearest of the user's own messages that way. */
  readonly jumpToUserMessage?: (direction: 'previous' | 'next') => void
  /** The prompt card's collapse or expand; absent while no prompt can be hidden or shown. */
  readonly onTogglePrompt?: () => void
  /**
   * Moves the transcript by a signed distance from where it is now. The view owns where that is:
   * a remembered offset of our own would disagree with a touch scroll, new messages and the
   * tail-follow, and that disagreement is what made trigger scrolling jump to the top.
   */
  readonly scrollBy: (delta: number) => void
}

export function useAgentControllerBinding(options: AgentControllerBindingOptions): void {
  const { sessionId, canStop, onStop } = options
  // A boolean, not the callback: the card's toggle is rebuilt per render and runs through `latest`.
  const canTogglePrompt = options.onTogglePrompt !== undefined
  const latest = useRef(options)
  useLayoutEffect(() => {
    latest.current = options
  })
  const scrollEntry = useScrollIntentEntry(LIST_SCROLL_RATE, options.scrollBy)

  const { ask, permission, question, onRespondPermission, onCancelAsk, onCancelPrompt } = options
  const intervention = useMemo(
    () =>
      resolveAgentIntervention({
        ask,
        permission,
        question,
        onRespondPermission,
        onCancelAsk,
        onCancelPrompt
      }),
    [ask, permission, question, onRespondPermission, onCancelAsk, onCancelPrompt]
  )

  const binding = useMemo<SurfaceBinding>(() => {
    const entries: IntentHandlerEntry[] = [
      scrollEntry,
      [
        'move-selection',
        (intent) => {
          if (intent.kind === 'move-selection') {
            const step =
              intent.direction === 'up' ? -DPAD_SCROLL_STEP_POINTS : DPAD_SCROLL_STEP_POINTS
            latest.current.scrollBy(step)
          }
        }
      ]
    ]

    entries.push([
      'jump-message',
      (intent) => {
        if (intent.kind === 'jump-message') {
          latest.current.jumpToUserMessage?.(intent.direction)
        }
      }
    ])

    if (intervention?.accept != null) {
      entries.push(['confirm', intervention.accept])
    }
    if (intervention?.reject != null) {
      entries.push(['back', intervention.reject])
    }

    // The chat decides whether a turn can be stopped, and a stop its button would refuse is
    // unavailable here too. Close and launch belong to the session around the chat.
    const stopAction: WheelActionBinding = {
      id: DO_ACTION_IDS.stop,
      label: 'Stop agent',
      availability: canStop && onStop !== undefined ? 'available' : 'unavailable',
      reason: 'Nothing running to stop',
      run: () => latest.current.onStop?.()
    }
    const promptAction: WheelActionBinding = {
      id: VIEW_ACTION_IDS.question,
      label: 'Show or hide prompt',
      availability: canTogglePrompt ? 'available' : 'unavailable',
      reason: 'No prompt to show or hide',
      run: () => latest.current.onTogglePrompt?.()
    }
    const wheelActions: readonly WheelActionBinding[] = [stopAction, promptAction]

    return {
      focusTarget: {
        ...focusTargetFor(`agent:${sessionId}`, entries),
        zone: 'agent',
        priority: FOCUS_PRIORITY.surface,
        labels: {
          scroll: 'Scroll',
          'move-selection': 'Scroll',
          'jump-message': 'My messages',
          confirm: 'Allow',
          back: 'Dismiss'
        }
      },
      wheelActions
    }
  }, [sessionId, canStop, onStop, canTogglePrompt, intervention, scrollEntry])

  useSurfaceBinding(binding)
}
