import { describe, expect, it } from 'vitest'
import {
  collectionItemsFromHostRows,
  collectionSummary,
  EMPTY_COLLECTION,
  selectCollectionItem,
  setCollectionLayout
} from './collection-model'
import { groupItems } from './grouping'

/** A host row as the worktree snapshot sends it, plus fields this build does not know. */
const ROWS = [
  { paneKey: 'tab:1', taskTitle: 'Ship the deck', state: 'running', repoId: 'repo-a', extra: 1 },
  { paneKey: 'tab:2', taskTitle: 'Wait for review', state: 'waiting', repoId: 'repo-b' },
  { paneKey: 'tab:3', taskTitle: 'Done thing', state: 'done', repoId: 'repo-a' },
  { nope: true },
  { paneKey: 'tab:4', state: 'hibernating' }
]

describe('collection model', () => {
  it('reads host rows leniently, keeping unknown status neutral and dropping id-less rows', () => {
    const items = collectionItemsFromHostRows(ROWS)
    expect(items.map((item) => item.id)).toEqual(['tab:1', 'tab:2', 'tab:3', 'tab:4'])
    // Neither `waiting` nor `hibernating` is in this build's vocabulary: both stay neutral.
    expect(items.map((item) => item.status)).toEqual(['running', 'unknown', 'done', 'unknown'])
    expect(items[3].title).toBe('')
  })

  it('counts every status, including the neutral one', () => {
    expect(collectionSummary(collectionItemsFromHostRows(ROWS))).toEqual({
      'needs-you': 0,
      running: 1,
      idle: 0,
      done: 1,
      unknown: 2
    })
  })

  it('groups the same rows the same way for a list and a panel', () => {
    const items = collectionItemsFromHostRows(ROWS)
    const byStatus = groupItems(items, 'status')
    expect(byStatus.map((group) => group.key)).toEqual(['running', 'done', 'unknown'])
    const byProject = groupItems(items, 'project')
    expect(byProject.map((group) => group.key)).toEqual(['repo-a', 'repo-b', 'unassigned'])
    expect(groupItems(items, 'none')).toEqual([{ key: 'all', items }])
  })

  it('moves selection onto the first item when the selected one is gone', () => {
    const model = { ...EMPTY_COLLECTION, items: collectionItemsFromHostRows(ROWS) }
    expect(selectCollectionItem(model, 'tab:2').selectedId).toBe('tab:2')
    expect(selectCollectionItem(model, 'tab:gone').selectedId).toBe('tab:1')
    expect(selectCollectionItem(EMPTY_COLLECTION, 'tab:1').selectedId).toBeNull()
  })

  it('keeps the chosen layout', () => {
    expect(setCollectionLayout(EMPTY_COLLECTION, 'kanban').layout).toBe('kanban')
  })
})
