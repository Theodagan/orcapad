import { Stack } from 'expo-router'
import { useDeckTheme } from '../../src/deck/theme/deck-theme'
import { useMobileTranslation } from '../../src/i18n/use-mobile-translation'

// The deck draws its own chrome: no navigation header, and the deck's page colour behind every route.
export default function DeckGroupLayout() {
  const theme = useDeckTheme()
  const t = useMobileTranslation()
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.color.base }
      }}
    >
      <Stack.Screen name="index" options={{ title: t('deck.title', 'Deck') }} />
    </Stack>
  )
}
