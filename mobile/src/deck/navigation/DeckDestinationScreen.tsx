import type { ReactNode } from 'react'
import { useWindowDimensions } from 'react-native'
import { useLocalSearchParams, usePathname, useRouter } from 'expo-router'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { MobileStateView } from '../../components/MobileStateView'
import { DeckShell } from '../DeckShell'
import { DeckHeader } from '../chrome/DeckHeader'
import { deckRouteFromRouter, resolveDeckContext } from '../context/deck-context'
import { PanelColumns } from '../panels/PanelColumns'
import { AllOpen, type DeckOpenItem } from '../panels/left/AllOpen'
import { QuickMenu } from '../panels/left/QuickMenu'
import type { DeckPanel } from '../panels/panel-registry'
import { destinationById, type DeckDestinationId } from './destinations'

const NO_OPEN_ITEMS: readonly DeckOpenItem[] = []

const NO_CRUMB_NAMES = { host: null, project: null, workspace: null, session: null } as const

/**
 * DECK-R38: a destination with nothing to show says what is empty and how it fills, and says it
 * with Orca's own empty state. Each destination replaces this as its data lands; until then the
 * columns are already there, with the left panels the deck offers everywhere (DECK-R3).
 */
export function DeckDestinationScreen({
  destination,
  openItems = NO_OPEN_ITEMS
}: {
  destination: DeckDestinationId
  /** What the deck has open; the screens that open workspaces and sessions supply it. */
  openItems?: readonly DeckOpenItem[]
}): ReactNode {
  const t = useMobileTranslation()
  const router = useRouter()
  const { width } = useWindowDimensions()
  const context = resolveDeckContext(deckRouteFromRouter(usePathname(), useLocalSearchParams()))
  const { labelKey } = destinationById(destination)
  const renderPanel = (panel: DeckPanel): ReactNode | undefined => {
    if (panel.id === 'quick-menu') {
      return (
        <QuickMenu current={destination} onOpen={(id) => router.push(destinationById(id).route)} />
      )
    }
    if (panel.id === 'all-open') {
      return (
        <AllOpen items={openItems} currentId={null} onOpen={(item) => router.push(item.route)} />
      )
    }
    return undefined
  }
  return (
    <DeckShell>
      <DeckHeader context={context} names={NO_CRUMB_NAMES} />
      <PanelColumns screen={destination} windowWidth={width} renderPanel={renderPanel}>
        <MobileStateView
          title={t(labelKey, labelKey)}
          message={t(
            'deck.empty.body',
            'Nothing here yet. Pair a desktop or start an agent to fill it.'
          )}
        />
      </PanelColumns>
    </DeckShell>
  )
}
