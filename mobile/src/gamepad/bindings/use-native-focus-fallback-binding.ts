import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFocusSnapshot } from '../controller-provider'
import type { NativeFocusFallback } from '../controller-input/controller-runtime'
import { focusTargetFor, type SurfaceBinding } from './surface-binding'
import { useSurfaceBinding } from './use-surface-binding'

/** Below the root Back binding: it answers only for what nothing on the screen wants. */
const FALLBACK_PRIORITY = -1

/**
 * The D-pad and `A` on a screen the pad has no zones on (Changes, History, Tasks, the settings
 * pages): Android's own focus moves and presses there. A screen with zones owns its cursor, so the
 * fallback stands down rather than move a second, native one under it.
 */
export function useNativeFocusFallbackBinding(fallback: NativeFocusFallback): void {
  const latest = useRef(fallback)
  useLayoutEffect(() => {
    latest.current = fallback
  })
  const { zones } = useFocusSnapshot()
  const active = zones.length === 0

  const binding = useMemo<SurfaceBinding | null>(
    () =>
      active
        ? {
            focusTarget: {
              ...focusTargetFor('native-focus-fallback', [
                [
                  'move-selection',
                  (intent) => {
                    if (intent.kind === 'move-selection') {
                      latest.current.move(intent.direction)
                    }
                  }
                ],
                [
                  'move-horizontal',
                  (intent) => {
                    if (intent.kind === 'move-horizontal') {
                      latest.current.move(intent.direction)
                    }
                  }
                ],
                ['confirm', () => latest.current.activate()]
              ]),
              priority: FALLBACK_PRIORITY
            },
            wheelActions: []
          }
        : null,
    [active]
  )

  useSurfaceBinding(binding)
}
