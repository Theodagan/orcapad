import { orcaGamepad } from '../../../modules/orca-gamepad'
import { createAbsentControllerReader, type ControllerReader } from './controller-reader'
import { multicastControllerReader } from './multicast-controller-reader'
import { toControllerSample } from './native-controller-sample'

const SAMPLE_INTERVAL_MS = 8

/**
 * The reader the provider mounts. Falls back to the absent reader wherever the native module is
 * not present — iOS, a web preview, a test — which is a fact about the build, not evidence that
 * no controller is attached (`001` §9).
 */
export function createNativeControllerReader(): ControllerReader {
  if (orcaGamepad === null) {
    return createAbsentControllerReader()
  }
  const native = orcaGamepad
  // Multicast: a second subscriber's unsubscribe would otherwise stop the native layer for both.
  return multicastControllerReader({
    support: () => 'available',
    current: () => toControllerSample(native.currentSample()),
    subscribe: (listener) => {
      native.start(SAMPLE_INTERVAL_MS)
      const subscription = native.addListener('onControllerSample', (sample) => {
        listener(toControllerSample(sample))
      })
      return () => {
        subscription.remove()
        native.stop()
      }
    }
  })
}
