import { useCallback, useRef, useSyncExternalStore } from 'react'
import { CHORD_BUTTON } from './controller-bindings'
import type { ControllerReader } from './controller-reader'
import { isDown } from './sample-edges'

/** Whether the modifier is held now; re-renders only when that flips, not per sample. */
export function useModifierHeld(reader: ControllerReader): boolean {
  const held = useRef(false)
  const subscribe = useCallback(
    (notify: () => void) =>
      reader.subscribe((sample) => {
        const next = sample.connected && isDown(sample, CHORD_BUTTON)
        if (next !== held.current) {
          held.current = next
          notify()
        }
      }),
    [reader]
  )
  return useSyncExternalStore(subscribe, () => held.current)
}
