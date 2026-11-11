import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { FocusableOrca } from '../focus/focusable-orca'
import { useDeckTheme } from '../theme/deck-theme'

/**
 * T21: the explanation shown alongside the first in-app install. The words are the deck's; the
 * permission screen it opens is Android's own, and every control here is pad-reachable.
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
          'Android asks whether this app may install apps. Turn that on for Orcapad, then come back and press Install.'
        )}
      </Text>
      <FocusableOrca
        zone="list"
        id="deck-install-permission-open"
        order={0}
        onActivate={onOpenSettings}
        accessibilityLabel={t('deck.installPermission.open', 'Open Android settings')}
      >
        <View
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
        </View>
      </FocusableOrca>
      <FocusableOrca
        zone="list"
        id="deck-install-permission-later"
        order={1}
        row={1}
        onActivate={onDismiss}
        accessibilityLabel={t('deck.installPermission.later', 'Not now')}
      >
        <Text style={{ color: theme.color.text3, fontSize: theme.text.meta }}>
          {t('deck.installPermission.later', 'Not now')}
        </Text>
      </FocusableOrca>
    </View>
  )
}
