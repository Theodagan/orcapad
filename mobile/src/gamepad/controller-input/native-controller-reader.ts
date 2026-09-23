import { orcaGamepad } from '../../../modules/orca-gamepad'
import { createAbsentControllerReader, type ControllerReader } from './controller-reader'
import { toControllerSample } from './native-controller-sample'

const SAMPLE_INTERVAL_MS = 8

/**
 * Whether the focused view took the last controller event before the controller layer saw it,
 * and which view that was. `001/tech.md` §6 makes this a device checkpoint: a terminal WebView
 * that swallows controller input pauses the design rather than earning a workaround, so the
 * answer has to be readable rather than inferred from things not working.
 */
export type ControllerInterception = {
  readonly consumedByViewTree: boolean
  readonly focusedView: string
}

export function readControllerInterception(): ControllerInterception | null {
  if (orcaGamepad === null) {
    return null
  }
  const sample = orcaGamepad.currentSample()
  return { consumedByViewTree: sample.consumedByViewTree, focusedView: sample.focusedView }
}

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
  return {
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
  }
}
