import { useEffect } from 'react'
import { useControllerBinding } from '../controller-provider'
import type { FocusTarget } from './focus-target'

/**
 * How an existing surface takes controller focus while it is mounted. The surface keeps owning
 * its own state and actions; this only says which intents it accepts and where they go, so a
 * controller press and the equivalent tap reach the same callback (FND-R4).
 *
 * The target is re-registered whenever it changes identity, so a handler closing over fresh
 * props is never left stale — an intent reaching last render's callback is the kind of bug that
 * looks like a missed press.
 */
export function useControllerFocus(target: FocusTarget | null): void {
  const { registerFocusTarget } = useControllerBinding()

  useEffect(() => {
    if (target === null) {
      return
    }
    return registerFocusTarget(target)
  }, [registerFocusTarget, target])
}
