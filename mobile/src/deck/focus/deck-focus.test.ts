import { describe, expect, it } from 'vitest'
import {
  focusedDeckKey,
  initialDeckFocus,
  moveDeckFocus,
  reconcileDeckFocus,
  type DeckPaneItems
} from './deck-focus'

const ITEMS: DeckPaneItems = {
  left: ['quick', 'open'],
  main: ['session-a', 'session-b', 'session-c'],
  right: []
}

describe('deck focus', () => {
  it('starts on the main pane with exactly one key focused', () => {
    const state = initialDeckFocus(ITEMS)
    expect(focusedDeckKey(state)).toEqual({ pane: 'main', key: 'session-a' })
  })

  it('moves within the focused pane and never leaves it', () => {
    const start = initialDeckFocus(ITEMS)
    const down = moveDeckFocus(start, ITEMS, 'down')
    expect(focusedDeckKey(down)).toEqual({ pane: 'main', key: 'session-b' })
    const bottom = moveDeckFocus(moveDeckFocus(down, ITEMS, 'down'), ITEMS, 'down')
    expect(focusedDeckKey(bottom)).toEqual({ pane: 'main', key: 'session-c' })
  })

  it('moves between panes on left and right only when the neighbour has items', () => {
    const start = initialDeckFocus(ITEMS)
    const left = moveDeckFocus(start, ITEMS, 'left')
    expect(focusedDeckKey(left)).toEqual({ pane: 'left', key: 'quick' })
    // `right` is empty, so the cursor stays where it is.
    expect(moveDeckFocus(start, ITEMS, 'right')).toBe(start)
  })

  it('remembers the key it left in a pane', () => {
    const start = moveDeckFocus(initialDeckFocus(ITEMS), ITEMS, 'down')
    const inLeft = moveDeckFocus(start, ITEMS, 'left')
    const back = moveDeckFocus(inLeft, ITEMS, 'right')
    expect(focusedDeckKey(back)).toEqual({ pane: 'main', key: 'session-b' })
  })

  it('keeps focus on the same key across a re-render', () => {
    const state = moveDeckFocus(initialDeckFocus(ITEMS), ITEMS, 'down')
    const rerendered = { pane: state.pane, keys: { ...state.keys } }
    expect(focusedDeckKey(rerendered)).toEqual(focusedDeckKey(state))
  })

  it('reconciles focus when the focused item disappears', () => {
    const state = moveDeckFocus(initialDeckFocus(ITEMS), ITEMS, 'down')
    const reconciled = reconcileDeckFocus(state, { ...ITEMS, main: ['session-a'] })
    expect(focusedDeckKey(reconciled)).toEqual({ pane: 'main', key: 'session-a' })
  })
})
