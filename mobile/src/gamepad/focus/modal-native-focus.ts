import { useEffect, useRef, type RefObject } from 'react'
import type { View } from 'react-native'
import { useControllerBinding } from '../controller-provider'

/**
 * A sheet that opens takes the pad with it (`005` round 2). A React Native `Modal` is its own
 * Android window, so the app's controller layer hears nothing while one is up: the pad can only
 * work through Android's own focus, and that has nowhere to start until something inside the sheet
 * holds it. This puts the first focusable thing in the sheet under the pad, after which the D-pad
 * walks the sheet, `A` presses what it is on, and `B` closes it, all natively.
 *
 * The ref goes on a view that holds the sheet's controls and not its backdrop, and that is not
 * flattened away (`collapsable={false}`: a layout-only view has no native counterpart to focus).
 * Focus goes to the first control inside it, because a container that took focus itself would leave
 * the D-pad nowhere to go: everything it could reach is inside it.
 *
 * Only while a pad is attached, and a beat after the sheet appears: asking before the window has
 * been shown focuses nothing.
 */
const SHEET_SETTLE_MS = 150

export function useModalNativeFocus(active: boolean): RefObject<View | null> {
  const { connected, requestNativeFocus } = useControllerBinding()
  const ref = useRef<View | null>(null)
  useEffect(() => {
    if (!active || !connected) {
      return
    }
    const timer = setTimeout(() => requestNativeFocus(ref.current, true), SHEET_SETTLE_MS)
    return () => clearTimeout(timer)
  }, [active, connected, requestNativeFocus])
  return ref
}
