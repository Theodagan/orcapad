import { DeckDestinationScreen } from '../../../src/deck/navigation/DeckDestinationScreen'
import { DeckSessions } from '../../../src/deck/sessions/DeckSessions'

export default function SessionsRoute() {
  return (
    <DeckDestinationScreen destination="sessions">
      <DeckSessions />
    </DeckDestinationScreen>
  )
}
