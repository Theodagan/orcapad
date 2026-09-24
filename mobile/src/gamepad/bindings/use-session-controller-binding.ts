import { useMemo } from 'react'
import { nextCyclicId, selectedItem } from './list-selection'
import { focusTargetFor, type IntentHandlerEntry } from './surface-binding'
import { useSurfaceBinding } from './use-surface-binding'

/**
 * The session route's controller edge: cycle its tabs and leave it.
 *
 * Unlike the lists, cycling here activates as it goes. A tab strip already has an active item and
 * LB/RB is the PRD's way of changing it, so there is no separate selection to confirm — the
 * activation is the existing `switchSessionTab`, with its host notification and subscription
 * handover intact (BIND-R4, `003` §4).
 *
 * The target is named for the session it belongs to. That is the "active session identity" of
 * `003` §2: `X` reaches the focused session because the binding that answers it is mounted
 * inside this one, not because anything keeps a separate record of which session is current.
 */

export type SessionControllerBindingOptions<T> = {
  /** The route's own worktree id, which is what makes this target one session's rather than any. */
  readonly sessionId: string
  readonly tabs: readonly T[]
  readonly idOf: (tab: T) => string
  readonly activeTabId: string | null
  readonly onSwitchTab: (tab: T) => void
  readonly onBack: () => void
}

export function useSessionControllerBinding<T>(options: SessionControllerBindingOptions<T>): void {
  const { sessionId, tabs, idOf, activeTabId, onSwitchTab, onBack } = options

  const binding = useMemo(() => {
    const entries: IntentHandlerEntry[] = [
      [
        'cycle-tab',
        (intent) => {
          if (intent.kind !== 'cycle-tab') {
            return
          }
          const nextId = nextCyclicId(tabs, idOf, activeTabId, intent.direction)
          const next = selectedItem(tabs, idOf, nextId)
          // A single tab cycles to itself; switching to the tab already active would replay a
          // handover for no reason.
          if (next !== null && nextId !== activeTabId) {
            onSwitchTab(next)
          }
        }
      ],
      ['back', onBack]
    ]
    // Scroll belongs to whatever is inside the tab — the transcript (BIND-T4) and the terminal
    // scrollback (BIND-T6) own their own scrollers, and a session-level one would fight them.
    return { focusTarget: focusTargetFor(`session:${sessionId}`, entries), wheelActions: [] }
  }, [sessionId, tabs, idOf, activeTabId, onSwitchTab, onBack])

  useSurfaceBinding(binding)
}
