import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { useMobileTranslation } from '../../../i18n/use-mobile-translation'
import { FocusableOrca } from '../../focus/focusable-orca'
import { DECK_DESTINATIONS, type DeckDestinationId } from '../../navigation/destinations'
import { useDeckTheme } from '../../theme/deck-theme'

/**
 * PANEL-1: the left column's first panel is every destination, read from the one registry
 * (UXA-R18) so a destination cannot be missing here while its route exists. One press opens it,
 * from the pad or from a finger — the row is the same control either way (DECK-R13).
 */
export function QuickMenu({
  current,
  onOpen
}: {
  current: DeckDestinationId | null
  onOpen: (id: DeckDestinationId) => void
}): ReactNode {
  const theme = useDeckTheme()
  const t = useMobileTranslation()
  return (
    <View style={{ gap: theme.space.xs }}>
      {DECK_DESTINATIONS.map((destination, index) => (
        <FocusableOrca
          key={destination.id}
          zone="panels"
          id={`quick-menu:${destination.id}`}
          order={index}
          onActivate={() => onOpen(destination.id)}
        >
          <Text
            style={{
              color: destination.id === current ? theme.color.text1 : theme.color.text2,
              fontSize: theme.text.body,
              paddingVertical: theme.space.xs
            }}
          >
            {t(destination.labelKey, destination.labelKey)}
          </Text>
        </FocusableOrca>
      ))}
    </View>
  )
}
