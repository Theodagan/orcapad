import type { DeckScreenKind } from '../context/deck-context'
import type { DisabledReason } from '../host/disabled-reason'

/**
 * DECK-R3/PNL-2: the right-hand panels are a per-screen registry that also answers why a panel is
 * not available, so a screen never invents a panel or draws a control that does nothing.
 */
export type DeckPanelSide = 'left' | 'right'

export type DeckPanel = {
  readonly id: string
  readonly side: DeckPanelSide
  readonly titleKey: string
  /** `null` when it can be opened; the reason when it cannot (DECK-R37). */
  readonly disabledReason: DisabledReason | null
}

const LEFT_PANELS: readonly DeckPanel[] = [
  { id: 'quick-menu', side: 'left', titleKey: 'deck.panel.quickMenu', disabledReason: null },
  { id: 'all-open', side: 'left', titleKey: 'deck.panel.allOpen', disabledReason: null }
]

const RIGHT_PANELS: Readonly<Record<DeckScreenKind, readonly DeckPanel[]>> = {
  overview: [],
  sessions: [],
  projects: [],
  approvals: [],
  // PRJ-4 has no workspace-ports RPC in this baseline (COVERAGE.md): the panel says so.
  ports: [
    { id: 'ports', side: 'right', titleKey: 'deck.panel.ports', disabledReason: 'not-declared' }
  ],
  settings: [],
  workspace: [{ id: 'items', side: 'right', titleKey: 'deck.panel.items', disabledReason: null }],
  session: [
    { id: 'session-log', side: 'right', titleKey: 'deck.panel.sessionLog', disabledReason: null },
    { id: 'forks', side: 'right', titleKey: 'deck.panel.forks', disabledReason: null }
  ],
  unknown: []
}

export function deckPanelsForScreen(screen: DeckScreenKind): readonly DeckPanel[] {
  return [...LEFT_PANELS, ...RIGHT_PANELS[screen]]
}

export function panelsForSide(screen: DeckScreenKind, side: DeckPanelSide): readonly DeckPanel[] {
  return deckPanelsForScreen(screen).filter((panel) => panel.side === side)
}
