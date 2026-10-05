import type { WheelMenuEntry } from './wheel-registry'
import type { WheelSegment } from './wheel-segment'

/**
 * Turning a list into a second wheel. The list is data the surface supplies when the wheel opens
 * (agents, ports), so unlike a preset its length is not known in advance; this decides how it is
 * laid out, and what happens when it is too long to read.
 *
 * Eight is the most a thumb can tell apart. Past that the last segment becomes "More", which opens
 * the next page as one more level, so `B` steps back a page the way it steps back a menu.
 */

const FULL_TURN = Math.PI * 2
const MAX_SEGMENTS = 8
const BOUNDARY_OVERLAP = 0.001
const MORE_ID = '__more'

export type MenuStatus = 'loading' | 'ready' | 'error'

export type MenuView = {
  readonly status: MenuStatus
  readonly entries: readonly WheelMenuEntry[]
  /** Said in the middle of the wheel when there is nothing to choose: loading, empty, failed. */
  readonly message: string | null
}

export const LOADING_MENU: MenuView = { status: 'loading', entries: [], message: 'Loading…' }

/** The menu itself, then `#2`, `#3`, … for the pages after it. */
export function menuPageKey(base: string, page: number): string {
  return page <= 1 ? base : `${base}#${page}`
}

export function parseMenuKey(key: string): { readonly base: string; readonly page: number } {
  const at = key.lastIndexOf('#')
  const page = at === -1 ? 1 : Number(key.slice(at + 1))
  return at === -1 || !Number.isInteger(page) || page < 1
    ? { base: key, page: 1 }
    : { base: key.slice(0, at), page }
}

/** The binding id a menu entry's segment carries, so a commit can find the entry it came from. */
export function menuEntryBindingId(entryId: string): string {
  return `menu-entry:${entryId}`
}

function pageOf(entries: readonly WheelMenuEntry[], page: number): readonly WheelMenuEntry[] {
  if (entries.length <= MAX_SEGMENTS) {
    return entries
  }
  const size = MAX_SEGMENTS - 1
  return entries.slice((page - 1) * size, page * size)
}

function hasMore(entries: readonly WheelMenuEntry[], page: number): boolean {
  return entries.length > MAX_SEGMENTS && page * (MAX_SEGMENTS - 1) < entries.length
}

/** The segments of one page, evenly spread so each gets the same slice of the dial. */
export function menuSegments(key: string, view: MenuView): readonly WheelSegment[] {
  if (view.status !== 'ready') {
    return []
  }
  const { base, page } = parseMenuKey(key)
  const entries = pageOf(view.entries, page)
  const more = hasMore(view.entries, page)
  const count = entries.length + (more ? 1 : 0)
  if (count === 0) {
    return []
  }
  const halfWidth = Math.min(Math.PI, FULL_TURN / (2 * count) + BOUNDARY_OVERLAP)
  const place = (index: number) => ({
    centerAngle: (index / count) * FULL_TURN,
    halfWidth
  })
  const segments: WheelSegment[] = entries.map((entry, index) => ({
    id: entry.id,
    label: entry.label,
    ...place(index),
    availability: entry.availability,
    bindingId: menuEntryBindingId(entry.id)
  }))
  if (more) {
    segments.push({
      id: MORE_ID,
      label: 'More…',
      ...place(entries.length),
      availability: 'available',
      bindingId: menuPageKey(base, page + 1),
      opens: true
    })
  }
  return segments
}
