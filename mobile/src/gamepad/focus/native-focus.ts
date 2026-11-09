import { useEffect, useRef, type RefObject } from 'react'
import type { View } from 'react-native'
import { useControllerBinding } from '../controller-provider'

/**
 * The ref to put on the element that carries the controller's cursor (`005` USE-R6): Android's own
 * focus follows `active` turning on, so its focus highlight, scroll-into-view and screen-reader
 * cursor agree with our ring. It sits beside the ring, never in place of it.
 *
 * Only the moment it turns on matters, so a re-render while it stays on does not ask again. How the
 * request reaches Android is the controller runtime's business; without one this does nothing.
 */
export function useNativeFocus(active: boolean): RefObject<View | null> {
  const { requestNativeFocus } = useControllerBinding()
  const ref = useRef<View | null>(null)
  useEffect(() => {
    if (active) {
      requestNativeFocus(ref.current)
    }
  }, [active, requestNativeFocus])
  return ref
}
