import { useLayoutEffect, useMemo, useRef } from 'react'
import { resolveAgentIntervention, type InterventionSurface } from './agent-intervention'
import { AGENT_WHEEL_ACTION_IDS } from './agent-wheel-action-ids'
import {
  createScrollIntegrator,
  LIST_SCROLL_MINIMUM_FIRST_STEP_POINTS,
  LIST_SCROLL_POINTS_PER_SECOND_AT_FULL_PRESSURE
} from './controller-scroll-rate'
import type { WheelActionBinding } from '../wheel/wheel-registry'
import { agentReplyActions } from '../wheel/experiments/agent-reply-actions'
import { FOCUS_PRIORITY } from '../focus/focus-zones'
import { focusTargetFor, type IntentHandlerEntry, type SurfaceBinding } from './surface-binding'
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
 * Stopping is no longer on `X`: that became the zone switch (`005` USE-R4). The chat still decides
 * with `canStop` whether a turn can be stopped, and the wheel action below follows it.
 */

/** One D-pad press moves the transcript about three lines, like an arrow key in a reader. */
const DPAD_SCROLL_STEP_POINTS = 72

export type AgentControllerBindingOptions = InterventionSurface & {
  /** The session this view belongs to, so a stop names the turn it is stopping (`003` §2). */
  readonly sessionId: string
  readonly canStop: boolean
  readonly onStop?: () => void
  /**
   * Moves the transcript by a signed distance from where it is now. The view owns where that is:
   * a remembered offset of our own would disagree with a touch scroll, new messages and the
   * tail-follow, and that disagreement is what made trigger scrolling jump to the top.
   */
  readonly scrollBy: (delta: number) => void
  /**
   * The chat's own send. With it, `004` LOOP-R3's second path exists: a few replies committable
   * from the wheel when dictation is not available, which is otherwise a controller-only user
   * with nothing to say.
   */
  readonly onSendText?: (text: string) => void
  readonly canSend?: boolean
}

export function useAgentControllerBinding(options: AgentControllerBindingOptions): void {
  const { sessionId, canStop, onStop, onSendText, canSend } = options
  const latest = useRef(options)
  useLayoutEffect(() => {
    latest.current = options
  })
  const integrator = useMemo(
    () =>
      createScrollIntegrator({
        unitsPerSecond: LIST_SCROLL_POINTS_PER_SECOND_AT_FULL_PRESSURE,
        minimumFirstStep: LIST_SCROLL_MINIMUM_FIRST_STEP_POINTS
      }),
    []
  )

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
      [
        'scroll',
        (intent) => {
          if (intent.kind !== 'scroll') {
            return
          }
          const delta = integrator.step(intent)
          if (delta !== 0) {
            latest.current.scrollBy(delta)
          }
        }
      ],
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

    if (intervention?.accept != null) {
      entries.push(['confirm', intervention.accept])
    }
    if (intervention?.reject != null) {
      entries.push(['back', intervention.reject])
    }

    // The chat decides whether a turn can be stopped, and a stop its button would refuse is
    // unavailable here too. Close, handoff, launch and web arrive with the right wheel.
    const stopAction: WheelActionBinding = {
      id: AGENT_WHEEL_ACTION_IDS.stop,
      label: 'Stop agent',
      availability: canStop && onStop !== undefined ? 'available' : 'unavailable',
      run: () => latest.current.onStop?.()
    }
    const wheelActions: readonly WheelActionBinding[] = [
      stopAction,
      ...(onSendText === undefined ? [] : agentReplyActions(onSendText, canSend === true))
    ]

    return {
      focusTarget: {
        ...focusTargetFor(`agent:${sessionId}`, entries),
        zone: 'agent',
        priority: FOCUS_PRIORITY.surface,
        labels: { scroll: 'Scroll', 'move-selection': 'Scroll', confirm: 'Allow', back: 'Dismiss' }
      },
      wheelActions
    }
  }, [sessionId, canStop, onStop, intervention, onSendText, canSend, integrator])

  useSurfaceBinding(binding)
}
