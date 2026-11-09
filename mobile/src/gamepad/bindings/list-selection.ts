/**
 * Where the controller is pointing in a rendered list. Holds an id and an accessor, never a copy
 * of the list, so an item that appears, disappears or reorders is reflected the next time
 * selection is resolved rather than going stale (BIND-R1).
 *
 * Generic over the id because the surfaces disagree: a host is keyed by `id` and a workspace by
 * `worktreeId`. Copying either into a common shape would be the second catalog this exists to
 * avoid.
 */

export type IdOf<T> = (item: T) => string

/** Null when nothing is selected, or when what was selected is no longer in the list. */
export function selectedItem<T>(
  items: readonly T[],
  idOf: IdOf<T>,
  selectedId: string | null
): T | null {
  if (selectedId === null) {
    return null
  }
  return items.find((item) => idOf(item) === selectedId) ?? null
}

/**
 * Clamped, not wrapped. These lists scroll on past their rows into footers and other sections, so
 * wrapping from the last row back to the first would jump the view somewhere the thumb was not
 * asking for.
 *
 * A selection that has gone restarts from the end the move came from, which is the same thing
 * that happens on a first press.
 */
export function nextSelectedId<T>(
  items: readonly T[],
  idOf: IdOf<T>,
  selectedId: string | null,
  direction: 'up' | 'down'
): string | null {
  if (items.length === 0) {
    return null
  }
  const current = items.findIndex((item) => idOf(item) === selectedId)
  if (current === -1) {
    const edge = direction === 'down' ? items[0] : items[items.length - 1]
    return edge === undefined ? null : idOf(edge)
  }
  const step = direction === 'down' ? 1 : -1
  const next = items[Math.min(Math.max(current + step, 0), items.length - 1)]
  return next === undefined ? null : idOf(next)
}

/**
 * The next item round a ring, wrapping at both ends. Tabs, not lists: a tab strip is a ring you
 * cycle until you find the one you want, which is what LB/RB means everywhere else a person has
 * met it (BIND-R4). A scrolling list is a column you walk, so `nextSelectedId` above clamps.
 *
 * Falls to the first item when nothing is current, so a cycle always lands somewhere.
 */
export function nextCyclicId<T>(
  items: readonly T[],
  idOf: IdOf<T>,
  currentId: string | null,
  direction: 'previous' | 'next'
): string | null {
  if (items.length === 0) {
    return null
  }
  const current = items.findIndex((item) => idOf(item) === currentId)
  if (current === -1) {
    const first = items[0]
    return first === undefined ? null : idOf(first)
  }
  const step = direction === 'next' ? 1 : -1
  const wrapped = (current + step + items.length) % items.length
  const next = items[wrapped]
  return next === undefined ? null : idOf(next)
}
