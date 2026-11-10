import { COLLECTION_STATUSES, type CollectionStatus } from './collection-model'

/**
 * SES-6/GROUP-1: one grouping, used by every list and by the left panel's previews. Two consumers
 * that group the same rows differently is how a panel and its screen end up disagreeing.
 */
export type GroupingKey = 'status' | 'project' | 'none'

export type GroupableItem = {
  readonly id: string
  readonly projectId: string | null
  readonly status: CollectionStatus
}

export type CollectionGroup<T extends GroupableItem> = {
  readonly key: string
  readonly items: readonly T[]
}

/** Status order is the deck's reading order: what needs you, then what runs, then the rest. */
const STATUS_ORDER: readonly CollectionStatus[] = [...COLLECTION_STATUSES, 'unknown']

export function groupItems<T extends GroupableItem>(
  items: readonly T[],
  by: GroupingKey
): readonly CollectionGroup<T>[] {
  if (by === 'none') {
    return items.length === 0 ? [] : [{ key: 'all', items }]
  }
  if (by === 'status') {
    return STATUS_ORDER.flatMap((status) => {
      const matching = items.filter((item) => item.status === status)
      return matching.length === 0 ? [] : [{ key: status, items: matching }]
    })
  }
  const projectKeys = [...new Set(items.map((item) => item.projectId ?? 'unassigned'))].sort(
    (left, right) => left.localeCompare(right)
  )
  return projectKeys.flatMap((key) => {
    const matching = items.filter((item) => (item.projectId ?? 'unassigned') === key)
    return matching.length === 0 ? [] : [{ key, items: matching }]
  })
}
