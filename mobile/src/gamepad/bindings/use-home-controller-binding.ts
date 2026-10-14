import { useMemo } from 'react'
import { useZoneFocused } from '../zones/use-zone-focused'
import { LIST_SCROLL_RATE } from './controller-scroll-rate'
import { pairDesktopWheelAction } from './go-wheel-actions'
import { nextSelectedId, selectedItem } from './list-selection'
import { focusTargetFor, type IntentHandlerEntry } from './surface-binding'
import { useControllerListSelection } from './use-controller-list-selection'
import { useScrollIntentEntry } from './use-scroll-intent-entry'
import { useSurfaceBinding } from './use-surface-binding'

/**
 * The home screen's controller edge. Every action here is the one the card's own `onPress`
 * reaches, so a press and a tap cannot drift apart (BIND-AC3), and the host list stays the
 * existing one — this contributes a selected id and nothing else (BIND-R1).
 *
 * Selection only exists while a controller is attached. A highlighted card is meaningless to a
 * thumb, and BIND-AC10 keeps every bound surface working by touch exactly as before.
 */

const hostId = (host: { readonly id: string }): string => host.id

export type HomeControllerBindingOptions<T extends { readonly id: string }> = {
  /** The existing sorted catalog, in the order the list actually renders it (BIND-AC4). */
  readonly hosts: readonly T[]
  readonly onOpen: (host: T) => void
  readonly onPairDesktop: () => void
  /** Moves the list from where it really is; the screen wires it to the list's own offset. */
  readonly scrollBy: (delta: number) => void
}

export function useHomeControllerBinding<T extends { readonly id: string }>(
  options: HomeControllerBindingOptions<T>
): string | null {
  const { hosts, onOpen, onPairDesktop } = options
  const scrollEntry = useScrollIntentEntry(LIST_SCROLL_RATE, options.scrollBy)
  const listFocused = useZoneFocused('list')
  const { selectedId, current, select } = useControllerListSelection(hosts, hostId)

  const focusTarget = useMemo(() => {
    const entries: IntentHandlerEntry[] = [
      [
        'confirm',
        () => {
          const host = selectedItem(hosts, hostId, current())
          if (host !== null) {
            onOpen(host)
          }
        }
      ],
      scrollEntry,
      [
        // Provisional: the PRD contract has no list movement, so this arrives only when the
        // experimental D-pad set is enabled (CTRL-R2).
        'move-selection',
        (intent) => {
          if (intent.kind === 'move-selection') {
            select(nextSelectedId(hosts, hostId, current(), intent.direction))
          }
        }
      ]
    ]
    return { ...focusTargetFor('home', entries), zone: 'list' as const }
  }, [hosts, onOpen, scrollEntry, current, select])

  // GO's New slot on home (`012`).
  const wheelActions = useMemo(() => [pairDesktopWheelAction(onPairDesktop)], [onPairDesktop])
  const binding = useMemo(() => ({ focusTarget, wheelActions }), [focusTarget, wheelActions])

  useSurfaceBinding(binding)
  return listFocused ? selectedId : null
}
