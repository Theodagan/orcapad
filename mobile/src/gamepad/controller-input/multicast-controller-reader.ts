import type { ControllerReader } from './controller-reader'
import type { ControllerSample } from './controller-sample'

/**
 * One upstream subscription however many listeners there are. The native layer has one start/stop
 * switch and the held-input pump one timer, so a second subscriber must not start, stop or pump
 * them again: the first subscriber starts the upstream, the last one stops it.
 */
export function multicastControllerReader(reader: ControllerReader): ControllerReader {
  const listeners = new Set<(sample: ControllerSample) => void>()
  let unsubscribeUpstream: (() => void) | null = null

  const publish = (sample: ControllerSample): void => {
    let failure: { readonly error: unknown } | null = null
    // A snapshot, so a listener that unsubscribes mid-delivery does not skip its neighbour.
    for (const listener of Array.from(listeners)) {
      try {
        listener(sample)
      } catch (error) {
        failure ??= { error }
      }
    }
    if (failure !== null) {
      throw failure.error
    }
  }

  return {
    support: reader.support,
    current: reader.current,
    subscribe: (listener) => {
      // A wrapper per call, so the same function subscribed twice is two subscriptions.
      const entry = (sample: ControllerSample): void => listener(sample)
      listeners.add(entry)
      if (unsubscribeUpstream === null) {
        unsubscribeUpstream = reader.subscribe(publish)
      }
      let active = true
      return () => {
        if (!active) {
          return
        }
        active = false
        listeners.delete(entry)
        if (listeners.size === 0 && unsubscribeUpstream !== null) {
          const stop = unsubscribeUpstream
          unsubscribeUpstream = null
          stop()
        }
      }
    }
  }
}
