import { DeckDestinationScreen } from '../../../src/deck/navigation/DeckDestinationScreen'
import { DeckApprovals } from '../../../src/deck/approvals/DeckApprovals'

export default function ApprovalsRoute() {
  return (
    <DeckDestinationScreen destination="approvals">
      <DeckApprovals />
    </DeckDestinationScreen>
  )
}
