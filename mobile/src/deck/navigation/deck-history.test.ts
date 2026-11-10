import { describe, expect, it } from 'vitest'
import {
  currentDeckEntry,
  EMPTY_DECK_HISTORY,
  popDeckHistory,
  pushDeckHistory,
  type DeckHistory
} from './deck-history'

const OVERVIEW = { key: 'overview', title: ['deck.destination.overview', 'Overview'] } as const
const PROJECTS = { key: 'projects', title: ['deck.destination.projects', 'Projects'] } as const
const WORKSPACE = { key: 'workspace:w1', title: ['deck.workspace', 'Workspace'] } as const

function walked(): DeckHistory {
  return [OVERVIEW, PROJECTS, WORKSPACE].reduce(pushDeckHistory, EMPTY_DECK_HISTORY)
}

describe('deck history', () => {
  it('walks Overview → Projects → workspace and back twice to Overview with Y+B', () => {
    const first = popDeckHistory(walked())
    expect(first.entry).toEqual(PROJECTS)
    const second = popDeckHistory(first.history)
    expect(second.entry).toEqual(OVERVIEW)
    expect(currentDeckEntry(second.history)).toEqual(OVERVIEW)
  })

  it('stays put at the landing screen', () => {
    const landed = pushDeckHistory(EMPTY_DECK_HISTORY, OVERVIEW)
    const popped = popDeckHistory(landed)
    expect(popped.entry).toBeNull()
    expect(popped.history).toBe(landed)
  })

  it('does not push the place it is already showing', () => {
    const history = walked()
    expect(pushDeckHistory(history, WORKSPACE)).toBe(history)
  })

  it('keeps the entries in the order they were entered', () => {
    expect(walked().entries.map((entry) => entry.key)).toEqual([
      'overview',
      'projects',
      'workspace:w1'
    ])
  })
})
