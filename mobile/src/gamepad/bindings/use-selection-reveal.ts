import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import type { ViewToken } from 'react-native'

/**
 * Keeps the controller's selected row on screen (`005` USE-R5). A D-pad that moves a selection the
 * list does not follow is a cursor nobody can see, so when the selection leaves the viewport the
 * list is asked to bring it back, centred so there is lead on both sides.
 *
 * It scrolls only when the selected row is outside the viewport. Stick scrolling and touch move
 * the list without moving the selection, so neither is ever fought. Spread the returned props onto
 * the `FlatList` or `SectionList`; the surface supplies how its list scrolls to an id.
 *
 * `onScrollToIndexFailed` answers true only for a jump this hook asked for, so a list that has a
 * failure handler of its own for other jumps can hand it the rest.
 */

/** A row counts as on screen once nearly all of it is, so a half-clipped row is brought in. */
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 95 } as const

/** After a failed jump the list has measured nothing near the target; give it a moment, then retry. */
const RETRY_AFTER_MEASURING_MS = 120

export type SelectionRevealOptions<T> = {
  readonly selectedId: string | null
  readonly idOf: (item: T) => string
  /** Scrolls the surface's own list so the row with this id is centred. */
  readonly scrollToId: (id: string) => void
  /** The list's own jump, for rows it has not measured yet. */
  readonly scrollToOffset: (offset: number) => void
}

export function useSelectionReveal<T>(options: SelectionRevealOptions<T>): {
  readonly viewabilityConfig: typeof VIEWABILITY_CONFIG
  readonly onViewableItemsChanged: (info: { readonly changed: ViewToken<T>[] }) => void
  readonly onScrollToIndexFailed: (info: {
    readonly index: number
    readonly averageItemLength: number
  }) => boolean
} {
  const { selectedId } = options
  const viewable = useRef(new Set<string>())
  const latest = useRef(options)
  useLayoutEffect(() => {
    latest.current = options
  })

  const onViewableItemsChanged = useCallback((info: { readonly changed: ViewToken<T>[] }) => {
    for (const token of info.changed) {
      // A section header is reported with no item index; it is not a row the pad selects.
      if (token.index === null) {
        continue
      }
      const id = latest.current.idOf(token.item)
      if (token.isViewable) {
        viewable.current.add(id)
      } else {
        viewable.current.delete(id)
      }
    }
  }, [])

  // True only while this hook's own jump is on the stack: a list reports a failed jump from inside
  // the call that asked for it, which is how a failure is told apart from someone else's.
  const jumping = useRef(false)
  const jumpTo = useCallback((id: string): void => {
    jumping.current = true
    try {
      latest.current.scrollToId(id)
    } finally {
      jumping.current = false
    }
  }, [])

  useEffect(() => {
    // Nothing reported yet means the list has not laid out; scrolling blind would only jump.
    if (selectedId === null || viewable.current.size === 0 || viewable.current.has(selectedId)) {
      return
    }
    jumpTo(selectedId)
  }, [selectedId, jumpTo])

  const onScrollToIndexFailed = useCallback(
    (info: { readonly index: number; readonly averageItemLength: number }): boolean => {
      if (!jumping.current) {
        return false
      }
      latest.current.scrollToOffset(info.index * info.averageItemLength)
      const target = latest.current.selectedId
      setTimeout(() => {
        // The selection may have moved on while the list measured; chase only the live one.
        if (target !== null && latest.current.selectedId === target) {
          jumpTo(target)
        }
      }, RETRY_AFTER_MEASURING_MS)
      return true
    },
    [jumpTo]
  )

  return { viewabilityConfig: VIEWABILITY_CONFIG, onViewableItemsChanged, onScrollToIndexFailed }
}
