import { useMemo } from 'react'
import { LIST_SCROLL_RATE } from './controller-scroll-rate'
import { DECLINED } from '../focus/focus-target'
import {
  flattenListStops,
  nextStopId,
  sectionHeaderId,
  type OrderedSection
} from './workspace-list-order'
import { FOCUS_PRIORITY } from '../focus/focus-zones'
import { useZoneFocused } from '../zones/use-zone-focused'
import { focusTargetFor, type IntentHandlerEntry, type SurfaceBinding } from './surface-binding'
import { useControllerListSelection } from './use-controller-list-selection'
import { useScrollIntentEntry } from './use-scroll-intent-entry'
import { useSurfaceBinding } from './use-surface-binding'

/**
 * The host screen's controller edge: move through the workspaces the list is showing, open one,
 * and go back. Opening is the list's own action, so a press and a tap reach the same activation
 * and produce one effect (BIND-AC3).
 *
 * `X+LB/RB` and the provisional D-pad both move the selection rather than opening as they go.
 * That matters: cycling is how the PRD contract navigates a list at all — without it, a pad with
 * the experimental D-pad set disabled could select nothing here — and a cycle that activated
 * each workspace it passed would fire a `worktree.activate` per step.
 */

const stopId = (stop: { readonly id: string }): string => stop.id

export type WorkspaceControllerBindingOptions<T> = {
  /** The rendered sections, so selection follows sort, filter, search and collapse (BIND-AC4). */
  readonly sections: readonly OrderedSection<T>[]
  readonly idOf: (item: T) => string
  readonly onOpen: (item: T) => void
  /** Opens or closes a section: the same call its header's tap makes. */
  readonly onToggleSection?: (sectionKey: string) => void
  readonly onBack: () => void
  /** Moves the list from where it really is; the screen wires it to the list's own offset. */
  readonly scrollBy: (delta: number) => void
}

export function useWorkspaceControllerBinding<T>(
  options: WorkspaceControllerBindingOptions<T>
): string | null {
  const { sections, idOf, onOpen, onBack, onToggleSection } = options
  const scrollEntry = useScrollIntentEntry(LIST_SCROLL_RATE, options.scrollBy)
  const listFocused = useZoneFocused('list')

  const stops = useMemo(() => flattenListStops(sections, idOf), [sections, idOf])
  // A first press lands on the first workspace, so `A` opens something at once; headers are for
  // moving on to a section that shows no rows.
  const firstId = (stops.find((stop) => stop.kind === 'item') ?? stops[0])?.id ?? null
  const { selectedId, current, select } = useControllerListSelection(stops, stopId, firstId)

  const binding = useMemo<SurfaceBinding>(() => {
    const move = (direction: 'up' | 'down', only: 'all' | 'items'): void => {
      select(nextStopId(stops, current(), direction, only))
    }
    const selectedStop = () => stops.find((stop) => stop.id === current())
    const entries: IntentHandlerEntry[] = [
      [
        'confirm',
        () => {
          const selected = selectedStop()
          if (selected?.kind === 'item') {
            onOpen(selected.item)
          } else if (selected?.kind === 'header') {
            onToggleSection?.(selected.sectionKey)
          }
        }
      ],
      [
        // A header opens to the right and closes to the left; a row's left goes up to its header.
        'move-horizontal',
        (intent) => {
          const selected = selectedStop()
          if (intent.kind !== 'move-horizontal' || selected === undefined) {
            return DECLINED
          }
          if (selected.kind === 'header') {
            if (selected.collapsed === (intent.direction === 'right')) {
              onToggleSection?.(selected.sectionKey)
              return undefined
            }
            return DECLINED
          }
          const headerId =
            selected.sectionKey === null ? null : sectionHeaderId(selected.sectionKey)
          if (intent.direction === 'left' && stops.some((stop) => stop.id === headerId)) {
            select(headerId)
            return undefined
          }
          return DECLINED
        }
      ],
      ['back', onBack],
      scrollEntry,
      [
        'cycle-workspace',
        (intent) => {
          if (intent.kind !== 'cycle-workspace') {
            return
          }
          move(intent.direction === 'next' ? 'down' : 'up', 'items')
        }
      ],
      [
        // Provisional (CTRL-R2); `cycle-workspace` above is the PRD-contract way to do the same.
        'move-selection',
        (intent) => {
          if (intent.kind === 'move-selection') {
            move(intent.direction, 'all')
          }
        }
      ]
    ]
    // No wheel action yet: every workspace action worth naming is either destructive or belongs
    // to a surface `003` has not bound, and WHEEL-R7 keeps trials away from both.
    return {
      focusTarget: {
        ...focusTargetFor('workspace-list', entries),
        zone: 'list',
        priority: FOCUS_PRIORITY.surface
      },
      wheelActions: []
    }
  }, [stops, current, select, onOpen, onToggleSection, onBack, scrollEntry])

  useSurfaceBinding(binding)
  // The ring follows the pad: while it is pointed at the header, no row is where `A` would act.
  return listFocused ? selectedId : null
}
