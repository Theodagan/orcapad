/**
 * The workspace order the controller moves through: the one the list is actually rendering.
 *
 * BIND-AC4 is the whole point. The host screen sorts, filters, searches, groups and pins, and a
 * collapsed group renders no rows at all — so the only order that matches what the user sees is
 * the sections themselves, flattened. Recomputing it from the raw worktrees would be a second
 * ordering that disagrees with the screen the moment anyone types in the search box.
 */

export type OrderedSection<T> = { readonly data: readonly T[] }

/** Section rows in render order. A collapsed section contributes nothing, because it shows nothing. */
export function flattenSectionOrder<T>(sections: readonly OrderedSection<T>[]): readonly T[] {
  return sections.flatMap((section) => [...section.data])
}
