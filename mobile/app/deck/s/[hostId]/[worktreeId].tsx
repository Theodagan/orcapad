import { WorkspaceRoute } from '../../../../src/navigation/workspace-route'
import { DeckSession } from '../../../../src/deck/session/DeckSession'

export default function DeckSessionRoute() {
  return (
    <WorkspaceRoute>
      <DeckSession />
    </WorkspaceRoute>
  )
}
