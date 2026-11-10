/**
 * PAD-11: Y+B pops one step of the deck's own history. B never pops it — B closes the layer that is
 * open, and only when nothing is open does a dismissal look like a step back.
 */
export type DeckHistoryEntry = {
  /** A stable key: the route plus what it showed (a workspace id, a session id). */
  readonly key: string
  readonly title: readonly [string, string]
}

export type DeckHistory = { readonly entries: readonly DeckHistoryEntry[] }

export const EMPTY_DECK_HISTORY: DeckHistory = { entries: [] }

/** Entering a place pushes it; re-entering the current place changes nothing. */
export function pushDeckHistory(history: DeckHistory, entry: DeckHistoryEntry): DeckHistory {
  const current = history.entries[history.entries.length - 1]
  return current?.key === entry.key ? history : { entries: [...history.entries, entry] }
}

/** Pops one step and answers what to show, or null when there is nowhere back to. */
export function popDeckHistory(history: DeckHistory): {
  readonly history: DeckHistory
  readonly entry: DeckHistoryEntry | null
} {
  if (history.entries.length <= 1) {
    return { history, entry: null }
  }
  const entries = history.entries.slice(0, -1)
  return { history: { entries }, entry: entries[entries.length - 1] }
}

export function currentDeckEntry(history: DeckHistory): DeckHistoryEntry | null {
  return history.entries[history.entries.length - 1] ?? null
}
