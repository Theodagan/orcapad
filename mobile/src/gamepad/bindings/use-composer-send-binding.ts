import { useMemo } from 'react'
import { FOCUS_PRIORITY } from '../focus/focus-zones'
import { focusTargetFor, type SurfaceBinding } from './surface-binding'
import { useSurfaceBinding } from './use-surface-binding'

/**
 * `A` as Enter for a message composer (`005` USE-R3): with words in it, A sends them, so a
 * dictated message needs no touch to go out. Offered only while a send would be accepted, so a
 * press with nothing to send is not swallowed here and the hint bar does not promise it.
 *
 * Registered at the lowest priority in the agent zone: a pending permission or question answers
 * A first, because an agent waiting on you matters more than a draft.
 */
export type ComposerSendBindingOptions = {
  /** Distinct per composer, so a different chat is a different registration. */
  readonly composerKey: string
  /** The composer's own rule for whether its send button would act. */
  readonly canSend: boolean
  readonly onSend: () => void
  /**
   * Above the surface for a field whose surface answers `A` itself: a terminal sends Enter, and
   * while its command field holds a draft, `A` has to send the draft instead.
   */
  readonly priority?: number
}

export function useComposerSendBinding(options: ComposerSendBindingOptions): void {
  const { composerKey, canSend, onSend, priority = FOCUS_PRIORITY.screen } = options

  const binding = useMemo<SurfaceBinding | null>(() => {
    if (!canSend) {
      return null
    }
    return {
      focusTarget: {
        ...focusTargetFor(`composer:${composerKey}`, [['confirm', onSend]]),
        zone: 'agent',
        priority,
        labels: { confirm: 'Send' }
      },
      wheelActions: []
    }
  }, [composerKey, canSend, onSend, priority])

  useSurfaceBinding(binding)
}
