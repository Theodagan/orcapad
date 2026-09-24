import { useEffect, useMemo, useRef, useState } from 'react'
import { useController } from '../controller-provider'
import { nextScrollOffset } from './controller-scroll-offset'
import { nextSelectedId, selectedItem } from './list-selection'
import { flattenSectionOrder, type OrderedSection } from './workspace-list-order'
import { focusTargetFor, type IntentHandlerEntry } from './surface-binding'
import { useSurfaceBinding } from './use-surface-binding'

/**
 * The host screen's controller edge: move through the workspaces the list is showing, open one,
 * and go back. Opening is the list's own action, so a press and a tap reach the same activation
 * and produce one effect (BIND-AC3).
 *
 * `Y+LB/RB` and the provisional D-pad both move the selection rather than opening as they go.
 * That matters: cycling is how the PRD contract navigates a list at all — without it, a pad with
 * the experimental D-pad set disabled could select nothing here — and a cycle that activated
 * each workspace it passed would fire a `worktree.activate` per step.
 */

export type WorkspaceControllerBindingOptions<T> = {
  /** The rendered sections, so selection follows sort, filter, search and collapse (BIND-AC4). */
  readonly sections: readonly OrderedSection<T>[]
  readonly idOf: (item: T) => string
  readonly onOpen: (item: T) => void
  readonly onBack: () => void
  readonly scrollTo: (offset: number) => void
}

export function useWorkspaceControllerBinding<T>(
  options: WorkspaceControllerBindingOptions<T>
): string | null {
  const { sections, idOf, onOpen, onBack, scrollTo } = options
  const { connected } = useController()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const offsetRef = useRef(0)

  const order = useMemo(() => flattenSectionOrder(sections), [sections])
  const firstId = order[0] === undefined ? null : idOf(order[0])

  useEffect(() => {
    // Selection belongs to the controller, so it appears with one and leaves with it (BIND-AC10).
    setSelectedId((current) => (connected ? (current ?? firstId) : null))
  }, [connected, firstId])

  const binding = useMemo(() => {
    const move = (direction: 'up' | 'down'): void => {
      setSelectedId((current) => nextSelectedId(order, idOf, current, direction))
    }
    const entries: IntentHandlerEntry[] = [
      [
        'confirm',
        () => {
          const item = selectedItem(order, idOf, selectedId)
          if (item !== null) {
            onOpen(item)
          }
        }
      ],
      ['back', onBack],
      [
        'scroll',
        (intent) => {
          if (intent.kind !== 'scroll') {
            return
          }
          offsetRef.current = nextScrollOffset(offsetRef.current, intent.direction, intent.velocity)
          scrollTo(offsetRef.current)
        }
      ],
      [
        'cycle-workspace',
        (intent) => {
          if (intent.kind !== 'cycle-workspace') {
            return
          }
          move(intent.direction === 'next' ? 'down' : 'up')
        }
      ],
      [
        // Provisional (CTRL-R2); `cycle-workspace` above is the PRD-contract way to do the same.
        'move-selection',
        (intent) => {
          if (intent.kind === 'move-selection') {
            move(intent.direction)
          }
        }
      ]
    ]
    // No wheel action yet: every workspace action worth naming is either destructive or belongs
    // to a surface `003` has not bound, and WHEEL-R7 keeps trials away from both.
    return { focusTarget: focusTargetFor('workspace-list', entries), wheelActions: [] }
  }, [order, idOf, selectedId, onOpen, onBack, scrollTo])

  useSurfaceBinding(binding)
  return selectedId
}
