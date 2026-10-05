import {
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
  type RefObject
} from 'react'
import type { View } from 'react-native'
import { useControllerBinding } from '../controller-provider'
import { useNativeFocus } from '../focus/native-focus'
import { useControllerScreenActive } from '../focus/screen-focus-gate'
import type { FocusZone } from '../focus/focus-zones'

/**
 * One thing in a zone the D-pad can land on (`005` USE-R4, USE-R5). It does not draw the cursor:
 * it tells its children whether the cursor is on it, and the children draw it, so each surface
 * keeps its own markup and styles and a touch user's screen is exactly what it was. The child puts
 * `focusRef` on the element that carries the cursor, so Android's own focus can follow it too
 * (`005` USE-R6).
 *
 * Only the two items whose focus flips re-render on a move; everything else stays put.
 */
export type ZoneItemProps = {
  readonly zone: FocusZone
  /** Stable for this item across renders. */
  readonly id: string
  /** Position along its row. */
  readonly order: number
  readonly row?: number
  readonly disabled?: boolean
  /** The cursor starts here when the zone is entered afresh. */
  readonly home?: boolean
  /** What pressing it does: pass the function the touch handler calls. */
  readonly onActivate: () => void
  /** Called when the cursor lands on it, to scroll it into view. */
  readonly onReveal?: () => void
  readonly children: (state: {
    readonly focused: boolean
    readonly focusRef: RefObject<View | null>
  }) => ReactNode
}

export function ZoneItem({
  zone,
  id,
  order,
  row = 0,
  disabled = false,
  home = false,
  onActivate,
  onReveal,
  children
}: ZoneItemProps): ReactNode {
  const { zoneItems, connected } = useControllerBinding()
  const screenActive = useControllerScreenActive()
  const latest = useRef({ onActivate, onReveal })
  useLayoutEffect(() => {
    latest.current = { onActivate, onReveal }
  })

  useEffect(() => {
    if (!screenActive) {
      return
    }
    return zoneItems.register({
      zone,
      id,
      row,
      order,
      disabled,
      home,
      activate: () => latest.current.onActivate(),
      reveal: () => latest.current.onReveal?.()
    })
  }, [zoneItems, screenActive, zone, id, row, order, disabled, home])

  const cursorHere = useSyncExternalStore(
    zoneItems.subscribe,
    () => zoneItems.isFocused(zone, id),
    () => false
  )
  const focused = cursorHere && connected
  const focusRef = useNativeFocus(focused)

  return children({ focused, focusRef })
}
