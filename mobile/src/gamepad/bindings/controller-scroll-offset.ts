/**
 * Trigger pressure to a scroll position. Shared by every list a binding scrolls, because BIND-R3
 * makes L2/R2 analog scroll for all of them and the arithmetic should not be rediscovered per
 * surface.
 *
 * The resolver emits one scroll intent per sample for as long as the trigger is held, so this is
 * a per-sample step rather than a gesture: pressure sets speed, and holding sets distance.
 */

/** At full pressure, one sample moves about a row. Chosen to be tuned by device trial, not taste. */
export const SCROLL_PIXELS_AT_FULL_PRESSURE = 48

/**
 * Never below zero. The top is the only bound this can know — a list's content height belongs to
 * the list, which clamps the bottom itself when it is asked to scroll past the end.
 */
export function nextScrollOffset(
  current: number,
  direction: 'up' | 'down',
  velocity: number
): number {
  const distance = velocity * SCROLL_PIXELS_AT_FULL_PRESSURE
  const moved = direction === 'down' ? current + distance : current - distance
  return Math.max(moved, 0)
}
