/**
 * UXA-R18: one registry feeds the navigation, the left wheel and the previews, so a destination
 * cannot exist in one place and be missing in another. Overview is the landing screen.
 */
export type DeckDestinationId =
  | 'overview'
  | 'sessions'
  | 'projects'
  | 'approvals'
  | 'ports'
  | 'settings'

export type DeckDestination = {
  readonly id: DeckDestinationId
  /** The route inside `app/deck/`. */
  readonly route: string
  /** The catalog key; the English lives in `locales/en.json`. */
  readonly labelKey: string
}

export const DECK_DESTINATIONS: readonly DeckDestination[] = [
  { id: 'overview', route: '/deck/overview', labelKey: 'deck.destination.overview' },
  { id: 'sessions', route: '/deck/sessions', labelKey: 'deck.destination.sessions' },
  { id: 'projects', route: '/deck/projects', labelKey: 'deck.destination.projects' },
  {
    id: 'approvals',
    route: '/deck/approvals',
    labelKey: 'deck.destination.approvals'
  },
  { id: 'ports', route: '/deck/ports', labelKey: 'deck.destination.ports' },
  { id: 'settings', route: '/deck/settings', labelKey: 'deck.destination.settings' }
]

export const DECK_LANDING_DESTINATION: DeckDestinationId = 'overview'

export function destinationById(id: DeckDestinationId): DeckDestination {
  const found = DECK_DESTINATIONS.find((destination) => destination.id === id)
  if (found === undefined) {
    throw new Error(`unknown deck destination: ${id}`)
  }
  return found
}

/** The destination a deck path belongs to; null for the deck root or somewhere else. */
export function destinationForPath(pathname: string): DeckDestination | null {
  return (
    DECK_DESTINATIONS.find(
      (destination) =>
        pathname === destination.route || pathname.startsWith(`${destination.route}/`)
    ) ?? null
  )
}
