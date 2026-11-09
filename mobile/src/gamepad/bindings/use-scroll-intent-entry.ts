import { useLayoutEffect, useMemo, useRef } from 'react'
import { createScrollIntegrator, type ScrollIntegratorOptions } from './controller-scroll-rate'
import type { IntentHandlerEntry } from './surface-binding'

/**
 * The `scroll` handler every scrollable surface shares: trigger pressure integrated over time into
 * a distance, handed to the surface's own `scrollBy`. Stable across renders, so it never makes a
 * binding change identity; `scrollBy` is read at the moment of the press.
 */
export function useScrollIntentEntry(
  rate: ScrollIntegratorOptions,
  scrollBy: (delta: number) => void
): IntentHandlerEntry {
  const scrollByRef = useRef(scrollBy)
  useLayoutEffect(() => {
    scrollByRef.current = scrollBy
  })
  const { unitsPerSecond, minimumFirstStep } = rate
  return useMemo<IntentHandlerEntry>(() => {
    const integrator = createScrollIntegrator({ unitsPerSecond, minimumFirstStep })
    return [
      'scroll',
      (intent) => {
        if (intent.kind !== 'scroll') {
          return
        }
        const delta = integrator.step(intent)
        if (delta !== 0) {
          scrollByRef.current(delta)
        }
      }
    ]
  }, [unitsPerSecond, minimumFirstStep])
}
