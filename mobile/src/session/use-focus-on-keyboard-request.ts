import { useEffect, useLayoutEffect, useRef } from 'react'

/** The bar has to be laid out before a field in it can take focus. */
const KEYBOARD_FOCUS_DELAY_MS = 80

/**
 * The wheel asked for the keyboard (`005` round 3): once the field's strip is on screen, a beat
 * later, the field takes focus and the keyboard comes up. Only the request starting matters, so
 * what `focus` closes over changing does not ask again.
 */
export function useFocusOnKeyboardRequest(requested: boolean, focus: () => void): void {
  const latest = useRef(focus)
  useLayoutEffect(() => {
    latest.current = focus
  })
  useEffect(() => {
    if (!requested) {
      return
    }
    const timer = setTimeout(() => latest.current(), KEYBOARD_FOCUS_DELAY_MS)
    return () => clearTimeout(timer)
  }, [requested])
}
