import { useMemo, useRef } from 'react'
import { nextScrollOffset } from './controller-scroll-offset'
import { resolveAgentIntervention, type InterventionSurface } from './agent-intervention'
import type { WheelActionBinding } from '../wheel/wheel-registry'
import { agentReplyActions } from '../wheel/experiments/agent-reply-actions'
import { focusTargetFor, type IntentHandlerEntry } from './surface-binding'
import type { DictationTextTarget } from '../focus/focus-target'
import { useSurfaceBinding } from './use-surface-binding'

/**
 * The agent view's controller edge. Everything below is a callback the native chat already owns,
 * so a press and the equivalent tap reach the same intervention, the same stop and the same
 * transcript (BIND-R5, BIND-AC5).
 *
 * `A` and `B` are offered only while an intervention actually has an answer to give. With no
 * prompt on screen they are not accepted at all, rather than accepted and dropped — an intent
 * nothing answers stays a no-op (`001` §7 step 4).
 *
 * `X` is always the existing stop, and only while the turn can be stopped: the view already
 * decides that with `canStop`, and a stop the button would refuse must not be reachable by
 * another route.
 */

export type AgentControllerBindingOptions = InterventionSurface & {
  /** The session this view belongs to, so `X` names the turn it is stopping (`003` §2). */
  readonly sessionId: string
  readonly canStop: boolean
  readonly onStop?: () => void
  readonly scrollTo: (offset: number) => void
  /**
   * Where dictated text would land. Its presence is what lets `R3` start a microphone at all —
   * recording with nowhere to put the words leaves a mic running for nothing (`003` §6).
   */
  readonly textTarget?: DictationTextTarget
  /**
   * The chat's own send. With it, `004` LOOP-R3's second path exists: a few replies committable
   * from the wheel when dictation is not available, which is otherwise a controller-only user
   * with nothing to say.
   */
  readonly onSendText?: (text: string) => void
  readonly canSend?: boolean
  /** The transcript's tail-follow release; scrolling up must not snap back to the newest message. */
  readonly onDetachFromTail: () => void
}

export function useAgentControllerBinding(options: AgentControllerBindingOptions): void {
  const { sessionId, canStop, onStop, scrollTo, onDetachFromTail, textTarget } = options
  const { onSendText, canSend } = options
  const offsetRef = useRef(0)

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

  const binding = useMemo(() => {
    const entries: IntentHandlerEntry[] = [
      [
        'scroll',
        (intent) => {
          if (intent.kind !== 'scroll') {
            return
          }
          if (intent.direction === 'up') {
            // Otherwise the transcript pins itself back to the newest message mid-scroll.
            onDetachFromTail()
          }
          offsetRef.current = nextScrollOffset(offsetRef.current, intent.direction, intent.velocity)
          scrollTo(offsetRef.current)
        }
      ]
    ]

    if (canStop && onStop !== undefined) {
      entries.push(['stop', onStop])
    }
    if (intervention?.accept != null) {
      entries.push(['confirm', intervention.accept])
    }
    if (intervention?.reject != null) {
      entries.push(['back', intervention.reject])
    }

    // The only wheel actions here are replies. A stop stays off the wheel entirely (WHEEL-R7).
    const wheelActions: readonly WheelActionBinding[] =
      onSendText === undefined ? [] : agentReplyActions(onSendText, canSend === true)

    return {
      focusTarget: focusTargetFor(`agent:${sessionId}`, entries, textTarget),
      wheelActions
    }
  }, [
    sessionId,
    canStop,
    onStop,
    intervention,
    scrollTo,
    onDetachFromTail,
    textTarget,
    onSendText,
    canSend
  ])

  useSurfaceBinding(binding)
}
