import { DeckDestinationScreen } from '../../../src/deck/navigation/DeckDestinationScreen'
import { DeckProjects } from '../../../src/deck/projects/DeckProjects'

export default function ProjectsRoute() {
  return (
    <DeckDestinationScreen destination="projects">
      <DeckProjects />
    </DeckDestinationScreen>
  )
}
