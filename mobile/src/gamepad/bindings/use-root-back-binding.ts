import { useLayoutEffect, useMemo, useRef } from 'react'
import { DECLINED } from '../focus/focus-target'
import { FOCUS_PRIORITY } from '../focus/focus-zones'
import { focusTargetFor, type SurfaceBinding } from './surface-binding'
import { useSurfaceBinding } from './use-surface-binding'

/**
 * `B` leaves a screen that has no business of its own for it (`005` round 2). Most of the app's
 * screens are lists of buttons the pad cannot yet drive, and without this `B` on one of them did
 * nothing at all, because the pad's own fallback to the system Back key is suppressed so that a
 * bound `B` never navigates twice. The lowest priority and no zone: it answers only when nothing
 * the screen mounted wants `B`, and says so when there is nowhere left to go.
 */
export function useRootBackBinding(options: {
  /** Goes back and returns true, or returns false when there is no screen to go back to. */
  readonly goBack: () => boolean
}): void {
  const latest = useRef(options)
  useLayoutEffect(() => {
    latest.current = options
  })

  const binding = useMemo<SurfaceBinding>(
    () => ({
      focusTarget: {
        ...focusTargetFor('root-back', [
          ['back', () => (latest.current.goBack() ? undefined : DECLINED)]
        ]),
        priority: FOCUS_PRIORITY.screen,
        labels: { back: 'Back' }
      },
      wheelActions: []
    }),
    []
  )

  useSurfaceBinding(binding)
}
