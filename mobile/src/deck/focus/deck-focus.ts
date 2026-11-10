/**
 * NAV-6/7/11/12: one focus, one language (SD-1). Focus lives in a pane; the arrows move it inside
 * that pane and never across, L1/R1 move the pane, and every key is a stable id so a re-render
 * keeps the cursor where the user left it.
 */
export type DeckPaneId = 'left' | 'main' | 'right'

export type DeckFocusState = {
  readonly pane: DeckPaneId
  /** The focused id per pane, kept while the user works in another pane. */
  readonly keys: Readonly<Record<DeckPaneId, string | null>>
}

/** What each pane holds, in display order. Ids, not positions. */
export type DeckPaneItems = Readonly<Record<DeckPaneId, readonly string[]>>

export function initialDeckFocus(items: DeckPaneItems): DeckFocusState {
  return {
    pane: 'main',
    keys: {
      left: items.left[0] ?? null,
      main: items.main[0] ?? null,
      right: items.right[0] ?? null
    }
  }
}

export type DeckFocusDirection = 'up' | 'down' | 'left' | 'right'

const PANE_ORDER: readonly DeckPaneId[] = ['left', 'main', 'right']

/** Left and right change pane when the neighbouring pane has something to focus. */
export function moveDeckFocus(
  state: DeckFocusState,
  items: DeckPaneItems,
  direction: DeckFocusDirection
): DeckFocusState {
  if (direction === 'left' || direction === 'right') {
    const step = direction === 'left' ? -1 : 1
    const index = PANE_ORDER.indexOf(state.pane) + step
    const nextPane = PANE_ORDER[index]
    if (nextPane === undefined || items[nextPane].length === 0) {
      return state
    }
    const key = state.keys[nextPane] ?? items[nextPane][0]
    return { pane: nextPane, keys: { ...state.keys, [nextPane]: key ?? null } }
  }
  const paneItems = items[state.pane]
  if (paneItems.length === 0) {
    return state
  }
  const current = state.keys[state.pane]
  const index = current === null ? 0 : paneItems.indexOf(current)
  const step = direction === 'down' ? 1 : -1
  const nextIndex = Math.min(Math.max(index + step, 0), paneItems.length - 1)
  const next = paneItems[nextIndex]
  return next === current
    ? state
    : { pane: state.pane, keys: { ...state.keys, [state.pane]: next } }
}

/** Which id the cursor is on, or null when the focused pane is empty. */
export function focusedDeckKey(state: DeckFocusState): { pane: DeckPaneId; key: string } | null {
  const key = state.keys[state.pane]
  return key === null ? null : { pane: state.pane, key }
}

/** Drops keys that no longer exist, so a list that shrank cannot leave focus off-screen. */
export function reconcileDeckFocus(state: DeckFocusState, items: DeckPaneItems): DeckFocusState {
  const keys = { ...state.keys }
  for (const pane of PANE_ORDER) {
    const key = keys[pane]
    if (key === null || !items[pane].includes(key)) {
      keys[pane] = items[pane][0] ?? null
    }
  }
  return { pane: state.pane, keys }
}
