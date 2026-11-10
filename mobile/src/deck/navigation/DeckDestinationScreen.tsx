import type { ReactNode } from 'react'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { MobileStateView } from '../../components/MobileStateView'
import { DeckShell } from '../DeckShell'
import { destinationById, type DeckDestinationId } from './destinations'

/**
 * DECK-R38: a destination with nothing to show says what is empty and how it fills, and says it
 * with Orca's own empty state. Each destination replaces this as its data lands.
 */
export function DeckDestinationScreen({
  destination
}: {
  destination: DeckDestinationId
}): ReactNode {
  const t = useMobileTranslation()
  const { label } = destinationById(destination)
  return (
    <DeckShell>
      <MobileStateView
        title={t(label[0], label[1])}
        message={t(
          'deck.empty.body',
          'Nothing here yet. Pair a desktop or start an agent to fill it.'
        )}
      />
    </DeckShell>
  )
}
