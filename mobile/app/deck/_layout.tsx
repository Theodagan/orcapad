import { Stack } from 'expo-router'
import { colors } from '../../src/theme/mobile-theme'
import { useMobileColorScheme } from '../../src/theme/use-mobile-color-scheme'
import { useMobileTranslation } from '../../src/i18n/use-mobile-translation'

// The deck draws its own chrome: no navigation header, and the deck's page colour behind every route.
export default function DeckGroupLayout() {
  useMobileColorScheme()
  const t = useMobileTranslation()
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bgBase }
      }}
    >
      <Stack.Screen name="index" options={{ title: t('deck.title', 'Deck') }} />
    </Stack>
  )
}
