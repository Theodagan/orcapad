import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useControllerBinding } from '../controller-provider'
import {
  createScrollIntegrator,
  LIST_SCROLL_MINIMUM_FIRST_STEP_POINTS,
  LIST_SCROLL_POINTS_PER_SECOND_AT_FULL_PRESSURE
} from './controller-scroll-rate'
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
  const scrollByRef = useRef(options.scrollBy)
  useLayoutEffect(() => {
    scrollByRef.current = options.scrollBy
  })
  const integrator = useMemo(
    () =>
      createScrollIntegrator({
        unitsPerSecond: LIST_SCROLL_POINTS_PER_SECOND_AT_FULL_PRESSURE,
        minimumFirstStep: LIST_SCROLL_MINIMUM_FIRST_STEP_POINTS
      }),
    []
  )
  const { connected } = useControllerBinding()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const stops = useMemo(() => flattenListStops(sections, idOf), [sections, idOf])
  // A first press lands on the first workspace, so `A` opens something at once; headers are for
  // moving on to a section that shows no rows.
  const firstId = (stops.find((stop) => stop.kind === 'item') ?? stops[0])?.id ?? null

  useEffect(() => {
    // Selection belongs to the controller, so it appears with one and leaves with it (BIND-AC10).
    setSelectedId((current) => (connected ? (current ?? firstId) : null))
  }, [connected, firstId])

  const binding = useMemo<SurfaceBinding>(() => {
    const move = (direction: 'up' | 'down', only: 'all' | 'items'): void => {
      setSelectedId((current) => nextStopId(stops, current, direction, only))
    }
    const selected = stops.find((stop) => stop.id === selectedId)
    const entries: IntentHandlerEntry[] = [
      [
        'confirm',
        () => {
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
            setSelectedId(headerId)
            return undefined
          }
          return DECLINED
        }
      ],
      ['back', onBack],
      [
        'scroll',
        (intent) => {
          if (intent.kind !== 'scroll') {
            return
          }
          const delta = integrator.step(intent)
          if (delta !== 0) {
            scrollByRef.current(delta)
          }
        }
      ],
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
  }, [stops, selectedId, onOpen, onToggleSection, onBack, integrator])

  useSurfaceBinding(binding)
  // The ring follows the pad: while it is pointed at the header, no row is where `A` would act.
  return useZoneFocused('list') ? selectedId : null
}
