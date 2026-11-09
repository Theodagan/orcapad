/**
 * Where a list really is, so the controller can move it from there.
 *
 * Trigger scrolling used to keep an offset of its own, starting at zero and moving a fixed step
 * per sample, and asked the list to jump to it. That is a second opinion about where the list is,
 * and it was wrong from the first press: a transcript pinned to its newest message jumped to the
 * top, and anything the finger or a new message had moved was forgotten (`005` USE-R3).
 *
 * The list reports its own offset and size, and this moves relative to that. The list's events are
 * throttled, so a step taken just now is remembered for a moment instead of being overwritten by a
 * stale event that was already in flight.
 */

export type ScrollMetrics = {
  readonly offset: number
  readonly contentHeight: number
  readonly viewportHeight: number
}

export type ScrollStep = {
  /** Where the list was asked to go. */
  readonly offset: number
  readonly moved: boolean
  /** Whether that is the bottom, so a transcript can resume following its tail. */
  readonly atEnd: boolean
}

export type ScrollTracker = {
  /** Feed from the list's own scroll, content-size and layout events. */
  readonly record: (next: Partial<ScrollMetrics>) => void
  /** Moves by a signed distance from where the list is, stopping at both ends. */
  readonly by: (delta: number) => ScrollStep
  readonly metrics: () => ScrollMetrics
}

/** An event this soon after one of ours is the list catching up with us, not news about it. */
const OWN_SCROLL_SETTLE_MS = 120

export function createScrollTracker(
  scrollTo: (offset: number) => void,
  now: () => number = () => Date.now()
): ScrollTracker {
  let offset = 0
  let contentHeight = 0
  let viewportHeight = 0
  let ownScrollAt = Number.NEGATIVE_INFINITY

  const maxOffset = (): number => Math.max(contentHeight - viewportHeight, 0)

  return {
    record(next) {
      contentHeight = next.contentHeight ?? contentHeight
      viewportHeight = next.viewportHeight ?? viewportHeight
      if (next.offset !== undefined && now() - ownScrollAt > OWN_SCROLL_SETTLE_MS) {
        offset = next.offset
      }
    },
    by(delta) {
      const end = maxOffset()
      const target = Math.min(Math.max(offset + delta, 0), end)
      const moved = target !== offset
      if (moved) {
        scrollTo(target)
        offset = target
        ownScrollAt = now()
      }
      return { offset: target, moved, atEnd: target >= end }
    },
    metrics: () => ({ offset, contentHeight, viewportHeight })
  }
}
