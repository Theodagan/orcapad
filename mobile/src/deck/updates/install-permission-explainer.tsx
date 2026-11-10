import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { useDeckTheme } from '../theme/deck-theme'

/**
 * T21: the one-time explanation before the first in-app install. The words are the deck's; the
 * permission screen it opens is Android's own.
 */
export function InstallPermissionExplainer({
  onOpenSettings,
  onDismiss
}: {
  onOpenSettings: () => void
  onDismiss: () => void
}): ReactNode {
  const t = useMobileTranslation()
  const theme = useDeckTheme()
  return (
    <View
      style={{
        backgroundColor: theme.color.panel,
        borderRadius: theme.radius.surface,
        padding: theme.space.lg,
        gap: theme.space.sm
      }}
    >
      <Text style={{ color: theme.color.text1, fontSize: theme.text.title }}>
        {t('deck.installPermission.title', 'Allow installs from Orcapad')}
      </Text>
      <Text style={{ color: theme.color.text2, fontSize: theme.text.body }}>
        {t(
          'deck.installPermission.body',
          'Android asks once, in Settings, whether this app may install updates. Turn it on there, then come back and press Update.'
        )}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onOpenSettings}
        style={{
          backgroundColor: theme.color.accent,
          borderRadius: theme.radius.control,
          padding: theme.space.md,
          alignItems: 'center'
        }}
      >
        <Text style={{ color: theme.color.onAccent, fontSize: theme.text.body }}>
          {t('deck.installPermission.open', 'Open Android settings')}
        </Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onDismiss}>
        <Text style={{ color: theme.color.text3, fontSize: theme.text.meta }}>
          {t('deck.installPermission.later', 'Not now')}
        </Text>
      </Pressable>
    </View>
  )
}
