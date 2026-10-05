import { useCallback, useMemo } from 'react'
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native'
import { createScrollTracker } from './controller-scroll-tracker'

/**
 * What a list must do to be scrollable by trigger from where it actually is: report its own
 * offset and size, and say how to move itself. Spread `handlers` onto the list and hand
 * `scrollBy` to its binding; the list's own touch scrolling is untouched (BIND-AC10).
 */
export function useControllerListScroll(scrollToOffset: (offset: number) => void): {
  readonly scrollBy: (delta: number) => void
  readonly handlers: {
    readonly onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void
    readonly onContentSizeChange: (width: number, height: number) => void
    readonly onLayout: (event: LayoutChangeEvent) => void
    readonly scrollEventThrottle: number
  }
} {
  const tracker = useMemo(() => createScrollTracker(scrollToOffset), [scrollToOffset])

  const scrollBy = useCallback(
    (delta: number): void => {
      tracker.by(delta)
    },
    [tracker]
  )

  const handlers = useMemo(
    () => ({
      onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent
        tracker.record({
          offset: contentOffset.y,
          contentHeight: contentSize.height,
          viewportHeight: layoutMeasurement.height
        })
      },
      onContentSizeChange: (_width: number, height: number): void => {
        tracker.record({ contentHeight: height })
      },
      onLayout: (event: LayoutChangeEvent): void => {
        tracker.record({ viewportHeight: event.nativeEvent.layout.height })
      },
      scrollEventThrottle: 16
    }),
    [tracker]
  )

  return { scrollBy, handlers }
}
