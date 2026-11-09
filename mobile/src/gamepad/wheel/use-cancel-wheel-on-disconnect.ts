import { useEffect } from 'react'
import type { ControllerReader } from '../controller-input/controller-reader'

/**
 * An open wheel owns the pad and swallows touch (`005` USE-R11), so a pad that goes away mid-gesture
 * must not leave it open: nothing could close it from the controller, and the screen would be
 * unreachable by finger. The reader reports the disconnect as a sample, and a resolver emits no
 * intents for one, so the wheel would never hear about it from the intent stream.
 */
export function useCancelWheelOnDisconnect(reader: ControllerReader, cancel: () => void): void {
  useEffect(
    () =>
      reader.subscribe((sample) => {
        if (!sample.connected) {
          cancel()
        }
      }),
    [reader, cancel]
  )
}
