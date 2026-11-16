import { DeckDestinationScreen } from '../../../src/deck/navigation/DeckDestinationScreen'
import { DeckPorts } from '../../../src/deck/ports/DeckPorts'

export default function PortsRoute() {
  return (
    <DeckDestinationScreen destination="ports">
      <DeckPorts />
    </DeckDestinationScreen>
  )
}
