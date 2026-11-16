import { WorkspaceRoute } from '../../../../src/navigation/workspace-route'
import { DeckWorkspace } from '../../../../src/deck/workspace/DeckWorkspace'

export default function DeckWorkspaceRoute() {
  return (
    <WorkspaceRoute>
      <DeckWorkspace />
    </WorkspaceRoute>
  )
}
