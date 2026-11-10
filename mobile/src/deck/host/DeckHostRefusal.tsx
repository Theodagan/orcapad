import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { CompatVerdict } from '../../transport/connection/protocol-compat'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { useDeckTheme } from '../theme/deck-theme'

/**
 * DECK-R43: when the desktop refuses this client, the deck says so plainly and offers the in-app
 * update instead of drawing a screen whose calls will all fail. The wording is the deck's own
 * (Orca's `ProtocolBlockScreen` sends the user to GitHub Releases; the deck installs in place).
 */
export function DeckHostRefusal({
  verdict,
  onUpdate,
  children
}: {
  verdict: CompatVerdict
  onUpdate: () => void
  children: ReactNode
}): ReactNode {
  const t = useMobileTranslation()
  const theme = useDeckTheme()
  if (verdict.kind !== 'blocked') {
    return <>{children}</>
  }
  const reason =
    verdict.reason === 'mobile-too-old'
      ? t(
          'deck.hostRefusal.mobileTooOld',
          'This desktop needs a newer Orcapad. Update the app, then try this host again.'
        )
      : t(
          'deck.hostRefusal.desktopTooOld',
          'This desktop is too old for this build of Orcapad. Update Orca on your computer, then try again.'
        )
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.color.base,
        padding: theme.space.xl,
        gap: theme.space.md,
        justifyContent: 'center'
      }}
    >
      <Text style={{ color: theme.color.text1, fontSize: theme.text.pageTitle }}>
        {t('deck.hostRefusal.title', 'This desktop cannot talk to this app')}
      </Text>
      <Text style={{ color: theme.color.text2, fontSize: theme.text.body }}>{reason}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onUpdate}
        style={{
          backgroundColor: theme.color.accent,
          borderRadius: theme.radius.control,
          padding: theme.space.md,
          alignItems: 'center'
        }}
      >
        <Text style={{ color: theme.color.onAccent, fontSize: theme.text.body }}>
          {t('deck.hostRefusal.update', 'Update Orcapad')}
        </Text>
      </Pressable>
    </View>
  )
}
