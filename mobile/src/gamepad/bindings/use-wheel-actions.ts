import { useEffect } from 'react'
import { useControllerBinding } from '../controller-provider'
import { useControllerScreenActive } from '../focus/screen-focus-gate'
import type { WheelBinding } from '../wheel/wheel-registry'

/**
 * Offers a surface's wheel bindings for exactly as long as it is mounted (`003` §10). For a
 * surface that has actions and menus to name but no focus target of its own to register.
 */
export function useWheelActions(bindings: readonly WheelBinding[]): void {
  const { registerWheelAction } = useControllerBinding()
  // A screen retained under another offers nothing: its actions would collide with the top one's.
  const screenActive = useControllerScreenActive()

  useEffect(() => {
    if (!screenActive) {
      return
    }
    const retractions = bindings.map((binding) => registerWheelAction(binding))
    return () => {
      for (const retract of retractions) {
        retract()
      }
    }
  }, [bindings, registerWheelAction, screenActive])
}
