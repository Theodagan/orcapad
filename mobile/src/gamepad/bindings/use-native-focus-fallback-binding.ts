import { useLayoutEffect, useMemo, useRef } from 'react'
import { useControllerBinding, useFocusSnapshot } from '../controller-provider'
import type { NativeFocusFallback } from '../controller-input/controller-runtime'
import { DECLINED } from '../focus/focus-target'
import { LIST_SCROLL_RATE } from './controller-scroll-rate'
import { focusTargetFor, type SurfaceBinding } from './surface-binding'
import { useScrollIntentEntry } from './use-scroll-intent-entry'
import { useSurfaceBinding } from './use-surface-binding'

const SCROLL_FALLBACK_ID = 'native-scroll-fallback'

/** Below the root Back binding: it answers only for what nothing on the screen wants. */
const FALLBACK_PRIORITY = -1

/**
 * The D-pad and `A` on a screen the pad has no zones on, and L2/R2 wherever nothing scrolls (Changes, History, Tasks, the settings
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
  useNativeScrollFallback(latest)
}

/**
 * L2/R2 on any screen where nothing else scrolls, zones or not. A list that scrolls itself keeps
 * its own count of where it is, so this gives way to it rather than move it underneath.
 */
function useNativeScrollFallback(latest: { readonly current: NativeFocusFallback }): void {
  const { focus } = useControllerBinding()
  const [, step] = useScrollIntentEntry(LIST_SCROLL_RATE, (delta) => latest.current.scroll(delta))
  const binding = useMemo<SurfaceBinding>(
    () => ({
      focusTarget: {
        ...focusTargetFor(SCROLL_FALLBACK_ID, [
          [
            'scroll',
            (intent) =>
              focus.acceptedElsewhere('scroll', SCROLL_FALLBACK_ID) ? DECLINED : step(intent)
          ]
        ]),
        priority: FALLBACK_PRIORITY
      },
      wheelActions: []
    }),
    [focus, step]
  )
  useSurfaceBinding(binding)
}
