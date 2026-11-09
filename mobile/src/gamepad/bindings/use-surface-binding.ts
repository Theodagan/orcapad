import { useEffect } from 'react'
import { useControllerBinding } from '../controller-provider'
import { useControllerScreenActive } from '../focus/screen-focus-gate'
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
  // A screen retained under another offers nothing: its actions would collide with the top one's.
  const screenActive = useControllerScreenActive()
  useEffect(() => {
    if (!screenActive || actions === undefined || actions.length === 0) {
      return
    }
    const retractions = actions.map((action) => registerWheelAction(action))
    return () => {
      for (const retract of retractions) {
        retract()
      }
    }
  }, [actions, registerWheelAction, screenActive])
}
