import { useEffect } from 'react'
import { useControllerBinding } from '../controller-provider'
import { useControllerFocus } from '../focus/use-controller-focus'
import type { SurfaceBinding } from './surface-binding'

/**
 * Mounts a surface's binding: its focus target while it is on screen, and its wheel actions for
 * exactly the same span (`003` §10). Split from the binding shapes next door so a pure builder
 * can be built and tested without React or a renderer.
 */
export function useSurfaceBinding(binding: SurfaceBinding | null): void {
  const { registerWheelAction } = useControllerBinding()
  useControllerFocus(binding?.focusTarget ?? null)

  const actions = binding?.wheelActions
  useEffect(() => {
    if (actions === undefined || actions.length === 0) {
      return
    }
    const retractions = actions.map((action) => registerWheelAction(action))
    return () => {
      for (const retract of retractions) {
        retract()
      }
    }
  }, [actions, registerWheelAction])
}
