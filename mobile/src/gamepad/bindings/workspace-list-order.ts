/**
 * The workspace order the controller moves through: the one the list is actually rendering.
 *
 * BIND-AC4 is the whole point. The host screen sorts, filters, searches, groups and pins, and a
 * collapsed group renders no rows at all — so the only order that matches what the user sees is
 * the sections themselves, flattened. Recomputing it from the raw worktrees would be a second
 * ordering that disagrees with the screen the moment anyone types in the search box.
 */

export type OrderedSection<T> = {
  readonly key?: string
  /** A section with a title draws a header, and the header is a stop of its own. */
  readonly title?: string | null
  readonly data: readonly T[]
}

/** Section rows in render order. A collapsed section contributes nothing, because it shows nothing. */
export function flattenSectionOrder<T>(sections: readonly OrderedSection<T>[]): readonly T[] {
  return sections.flatMap((section) => [...section.data])
}

/**
 * What the pad can stop on: every row, and every section header. A collapsed section shows no rows,
 * so without its header it would be skipped over and could never be opened with the pad. A header
 * with no rows under it is collapsed, because an expanded section always has at least one.
 */
export type ListStop<T> =
  | {
      readonly kind: 'header'
      readonly id: string
      readonly sectionKey: string
      readonly collapsed: boolean
    }
  | {
      readonly kind: 'item'
      readonly id: string
      readonly item: T
      readonly sectionKey: string | null
    }

export const SECTION_HEADER_PREFIX = 'section-header:'

export const sectionHeaderId = (sectionKey: string): string =>
  `${SECTION_HEADER_PREFIX}${sectionKey}`

export function flattenListStops<T>(
  sections: readonly OrderedSection<T>[],
  idOf: (item: T) => string
): readonly ListStop<T>[] {
  return sections.flatMap((section) => {
    const items = section.data.map((item): ListStop<T> => ({
      kind: 'item',
      id: idOf(item),
      item,
      sectionKey: section.key ?? null
    }))
    if (section.key === undefined || !section.title) {
      return items
    }
    const header: ListStop<T> = {
      kind: 'header',
      id: sectionHeaderId(section.key),
      sectionKey: section.key,
      collapsed: section.data.length === 0
    }
    return [header, ...items]
  })
}

/**
 * Clamped, like `nextSelectedId`: the next stop in the direction, or the same one at the edge. With
 * `only: 'items'` headers are stepped over, which is what cycling worktrees means.
 */
export function nextStopId<T>(
  stops: readonly ListStop<T>[],
  currentId: string | null,
  direction: 'up' | 'down',
  only: 'all' | 'items'
): string | null {
  const eligible = (stop: ListStop<T>): boolean => only === 'all' || stop.kind === 'item'
  const at = stops.findIndex((stop) => stop.id === currentId)
  const step = direction === 'down' ? 1 : -1
  // Nothing current: start from the end the move came from, as a first press does.
  const from = at === -1 ? (direction === 'down' ? 0 : stops.length - 1) : at + step
  for (let index = from; index >= 0 && index < stops.length; index += step) {
    const stop = stops[index]
    if (stop !== undefined && eligible(stop)) {
      return stop.id
    }
  }
  return at === -1 ? null : currentId
}
