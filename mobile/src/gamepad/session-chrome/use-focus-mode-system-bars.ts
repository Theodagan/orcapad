import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'
import { useSessionChrome } from './use-session-chrome'

/**
 * Focus mode hides the Android system bars, and they come back when it ends: by the toggle, by the
 * session, or by the pad going away (`useSessionChrome` is false without one). Must sit inside the
 * provider. The runtime's call is inert on a build without the native function.
 */
export function useFocusModeSystemBars(setImmersive: (enabled: boolean) => void): void {
  const { focusMode } = useSessionChrome()
  // A process killed in focus mode can leave the bars hidden, so the first mount shows them once.
  const bootedRef = useRef(false)
  useEffect(() => {
    if (bootedRef.current) {
      return
    }
    bootedRef.current = true
    if (!focusMode) {
      setImmersive(false)
    }
  }, [focusMode, setImmersive])

  useEffect(() => {
    if (!focusMode) {
      return
    }
    setImmersive(true)
    // Android shows the bars again on resume and after a dialog takes the window's focus.
    const resumed = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setImmersive(true)
      }
    })
    const refocused = AppState.addEventListener('focus', () => setImmersive(true))
    return () => {
      resumed.remove()
      refocused.remove()
      setImmersive(false)
    }
  }, [focusMode, setImmersive])
}
