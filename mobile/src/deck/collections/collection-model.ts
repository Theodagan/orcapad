import { lenientEnum, lenientRecord, lenientText } from '../host/lenient-host-data'

/**
 * COL-*: the deck's one collection model — the items a list draws, the buckets it draws them in,
 * and the layout it chose. Host rows arrive through T12's lenient helpers, so a status this build
 * has never heard of lands in `unknown` instead of blanking the screen (DECK-R42).
 */
export const COLLECTION_STATUSES = ['needs-you', 'running', 'idle', 'done'] as const

export type CollectionStatus = (typeof COLLECTION_STATUSES)[number] | 'unknown'

export type CollectionItem = {
  readonly id: string
  readonly title: string
  readonly projectId: string | null
  readonly status: CollectionStatus
}

export type CollectionLayoutKind = 'cards' | 'kanban' | 'list' | 'grid'

export type CollectionModel = {
  readonly layout: CollectionLayoutKind
  readonly items: readonly CollectionItem[]
  readonly selectedId: string | null
}

export const EMPTY_COLLECTION: CollectionModel = {
  layout: 'cards',
  items: [],
  selectedId: null
}

/** One host row, or null when it has no id: an id-less row cannot be focused, so it is not an item. */
export function collectionItemFromHostRow(raw: unknown): CollectionItem | null {
  const row = lenientRecord(raw)
  const id = lenientText(row.paneKey) || lenientText(row.id) || lenientText(row.worktreeId)
  if (id === '') {
    return null
  }
  return {
    id,
    title: lenientText(row.taskTitle) || lenientText(row.title) || lenientText(row.prompt),
    projectId: lenientText(row.repoId) || lenientText(row.projectId) || null,
    status: lenientEnum(row.state, COLLECTION_STATUSES)
  }
}

/** Every row that is an item, in the host's order. */
export function collectionItemsFromHostRows(raw: unknown): readonly CollectionItem[] {
  if (!Array.isArray(raw)) {
    return []
  }
  return raw.flatMap((row) => {
    const item = collectionItemFromHostRow(row)
    return item === null ? [] : [item]
  })
}

export type CollectionSummary = Readonly<Record<CollectionStatus, number>>

export function collectionSummary(items: readonly CollectionItem[]): CollectionSummary {
  const counts: Record<CollectionStatus, number> = {
    'needs-you': 0,
    running: 0,
    idle: 0,
    done: 0,
    unknown: 0
  }
  for (const item of items) {
    counts[item.status] += 1
  }
  return counts
}

/** Selection follows the list: a selected id that is gone selects the first item instead. */
export function selectCollectionItem(
  model: CollectionModel,
  selectedId: string | null
): CollectionModel {
  if (selectedId === null) {
    return { ...model, selectedId: null }
  }
  const exists = model.items.some((item) => item.id === selectedId)
  return { ...model, selectedId: exists ? selectedId : (model.items[0]?.id ?? null) }
}

export function setCollectionLayout(
  model: CollectionModel,
  layout: CollectionLayoutKind
): CollectionModel {
  return { ...model, layout }
}
