import { useEffect } from 'react'
import { useControllerBinding } from '../controller-provider'
import type { WheelBinding } from '../wheel/wheel-registry'

/**
 * Offers a surface's wheel bindings for exactly as long as it is mounted (`003` §10). For a
 * surface that has actions and menus to name but no focus target of its own to register.
 */
export function useWheelActions(bindings: readonly WheelBinding[]): void {
  const { registerWheelAction } = useControllerBinding()

  useEffect(() => {
    const retractions = bindings.map((binding) => registerWheelAction(binding))
    return () => {
      for (const retract of retractions) {
        retract()
      }
    }
  }, [bindings, registerWheelAction])
}
