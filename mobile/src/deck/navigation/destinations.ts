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
  readonly label: readonly [string, string]
}

export const DECK_DESTINATIONS: readonly DeckDestination[] = [
  { id: 'overview', route: '/deck/overview', label: ['deck.destination.overview', 'Overview'] },
  { id: 'sessions', route: '/deck/sessions', label: ['deck.destination.sessions', 'Sessions'] },
  { id: 'projects', route: '/deck/projects', label: ['deck.destination.projects', 'Projects'] },
  {
    id: 'approvals',
    route: '/deck/approvals',
    label: ['deck.destination.approvals', 'Approvals']
  },
  { id: 'ports', route: '/deck/ports', label: ['deck.destination.ports', 'Ports'] },
  { id: 'settings', route: '/deck/settings', label: ['deck.destination.settings', 'Settings'] }
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
