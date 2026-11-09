import { useSyncExternalStore } from 'react'
import { useControllerBinding } from '../controller-provider'
import type { FocusZone } from '../focus/focus-zones'

/**
 * Whether the pad is pointed at this zone right now. A boolean, so the caller re-renders when its
 * zone gains or loses the pad and not on every registration elsewhere. A surface hides its cursor
 * while it is false: a ring on something the buttons will not reach would lie about where they go.
 */
export function useZoneFocused(zone: FocusZone): boolean {
  const { focus } = useControllerBinding()
  return useSyncExternalStore(
    focus.subscribe,
    () => focus.snapshot().focusedZone === zone,
    () => false
  )
}
