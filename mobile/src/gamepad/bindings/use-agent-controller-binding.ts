import { useMemo, useRef } from 'react'
import { nextScrollOffset } from './controller-scroll-offset'
import { resolveAgentIntervention, type InterventionSurface } from './agent-intervention'
import { focusTargetFor, type IntentHandlerEntry } from './surface-binding'
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
  /** The transcript's tail-follow release; scrolling up must not snap back to the newest message. */
  readonly onDetachFromTail: () => void
}

export function useAgentControllerBinding(options: AgentControllerBindingOptions): void {
  const { sessionId, canStop, onStop, scrollTo, onDetachFromTail } = options
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

    // No wheel actions: everything the agent view can do is either an answer to a prompt that is
    // already on screen, or a stop — which WHEEL-R7 keeps off a trial wheel entirely.
    return { focusTarget: focusTargetFor(`agent:${sessionId}`, entries), wheelActions: [] }
  }, [sessionId, canStop, onStop, intervention, scrollTo, onDetachFromTail])

  useSurfaceBinding(binding)
}
