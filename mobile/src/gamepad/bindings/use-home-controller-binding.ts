import { useEffect, useMemo, useRef, useState } from 'react'
import { useControllerBinding } from '../controller-provider'
import { nextScrollOffset } from './controller-scroll-offset'
import { homeWheelActions } from './home-wheel-actions'
import { nextSelectedId, selectedItem } from './list-selection'
import { focusTargetFor, type IntentHandlerEntry } from './surface-binding'
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
  readonly scrollTo: (offset: number) => void
}

export function useHomeControllerBinding<T extends { readonly id: string }>(
  options: HomeControllerBindingOptions<T>
): string | null {
  const { hosts, onOpen, onPairDesktop, scrollTo } = options
  const { connected } = useControllerBinding()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const offsetRef = useRef(0)

  const firstHostId = hosts[0]?.id ?? null
  useEffect(() => {
    // Give the controller something to press `A` on, and take the highlight away again when the
    // pad leaves so a touch user is never left looking at a selection they cannot move.
    setSelectedId((current) => {
      if (!connected) {
        return null
      }
      return current ?? firstHostId
    })
  }, [connected, firstHostId])

  const binding = useMemo(() => {
    const entries: IntentHandlerEntry[] = [
      [
        'confirm',
        () => {
          const host = selectedItem(hosts, hostId, selectedId)
          if (host !== null) {
            onOpen(host)
          }
        }
      ],
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
        // Provisional: the PRD contract has no list movement, so this arrives only when the
        // experimental D-pad set is enabled (CTRL-R2).
        'move-selection',
        (intent) => {
          if (intent.kind !== 'move-selection') {
            return
          }
          setSelectedId((current) => nextSelectedId(hosts, hostId, current, intent.direction))
        }
      ]
    ]
    return {
      focusTarget: focusTargetFor('home', entries),
      // BIND-R10: an id a preset may name, declared next door so preset data never imports React.
      wheelActions: homeWheelActions(onPairDesktop)
    }
  }, [hosts, selectedId, onOpen, onPairDesktop, scrollTo])

  useSurfaceBinding(binding)
  return selectedId
}
