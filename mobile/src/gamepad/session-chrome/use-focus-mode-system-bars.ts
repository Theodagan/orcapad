import { useEffect } from 'react'
import { useSessionChrome } from './use-session-chrome'

/**
 * Focus mode hides the Android system bars, and they come back when it ends: by the toggle, by the
 * session, or by the pad going away (`useSessionChrome` is false without one). Must sit inside the
 * provider. The runtime's call is inert on a build without the native function.
 */
export function useFocusModeSystemBars(setImmersive: (enabled: boolean) => void): void {
  const { focusMode } = useSessionChrome()
  useEffect(() => {
    if (!focusMode) {
      return
    }
    setImmersive(true)
    return () => setImmersive(false)
  }, [focusMode, setImmersive])
}
