import { DeckDestinationScreen } from '../../../src/deck/navigation/DeckDestinationScreen'
import { DeckOverview } from '../../../src/deck/overview/DeckOverview'

export default function OverviewRoute() {
  return (
    <DeckDestinationScreen destination="overview">
      <DeckOverview />
    </DeckDestinationScreen>
  )
}
