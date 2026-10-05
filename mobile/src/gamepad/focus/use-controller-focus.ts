import { useEffect, useLayoutEffect, useRef } from 'react'
import { useControllerBinding } from '../controller-provider'
import type { FocusTarget } from './focus-target'
import { useControllerScreenActive } from './screen-focus-gate'

const NO_LABELS = ''

/**
 * How an existing surface takes controller focus while it is mounted. The surface keeps owning
 * its own state and actions; this only says which intents it accepts and where they go, so a
 * controller press and the equivalent tap reach the same callback (FND-R4).
 *
 * Registration follows what identifies the target (id, place, accepted intents), never its
 * handlers. Those are read through a ref at the moment of the press, so a re-render with fresh
 * props neither re-registers nor leaves a stale callback behind — and a re-render can no longer
 * look like a new mount, which is how a surface used to take focus from whoever was in front.
 */
export function useControllerFocus(target: FocusTarget | null): void {
  const { registerFocusTarget } = useControllerBinding()
  const screenActive = useControllerScreenActive()
  const latest = useRef(target)
  useLayoutEffect(() => {
    latest.current = target
  })

  const id = screenActive && target !== null ? target.id : null
  const zone = target?.zone
  const priority = target?.priority
  const acceptsKey = target === null ? '' : [...target.accepts].sort().join(',')
  const labelsKey = target?.labels === undefined ? NO_LABELS : JSON.stringify(target.labels)

  useEffect(() => {
    const current = latest.current
    if (id === null || current === null) {
      return
    }
    const labels = current.labels
    return registerFocusTarget({
      id,
      zone,
      priority,
      accepts: new Set(current.accepts),
      ...(labels === undefined ? {} : { labels }),
      handle: (intent) => latest.current?.handle(intent)
    })
  }, [registerFocusTarget, id, zone, priority, acceptsKey, labelsKey])
}
