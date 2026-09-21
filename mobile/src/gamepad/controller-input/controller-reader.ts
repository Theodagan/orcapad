import { neutralSample, type ControllerSample } from './controller-sample'

/** Whether this build can observe a controller at all, which is not whether one is attached. */
export type ControllerSupport = 'available' | 'unavailable'

/** The native boundary. It reports device truth and nothing about Orca (`001` §5). */
export type ControllerReader = {
  readonly support: () => ControllerSupport
  readonly current: () => ControllerSample
  readonly subscribe: (listener: (sample: ControllerSample) => void) => () => void
}

/**
 * The reader for a build with no native module — Expo Go, a web preview, a unit test. It says
 * `unavailable` rather than reporting a disconnected controller, because a missing module is
 * not evidence that the user has no controller (`001` §9). CTRL-T4 supplies the real one.
 */
export function createAbsentControllerReader(): ControllerReader {
  return {
    support: () => 'unavailable',
    current: () => neutralSample(0),
    subscribe: () => () => {}
  }
}
