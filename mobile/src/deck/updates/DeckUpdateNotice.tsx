import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { FocusableOrca } from '../focus/focusable-orca'
import { useDeckTheme } from '../theme/deck-theme'

/**
 * DECK-R47: a new version is announced once, without blocking anything. The notice is a toast with
 * two controls, both reachable by pad and finger; dismissing it is as valid as taking it.
 */
export function DeckUpdateNotice({
  version,
  onOpen,
  onDismiss
}: {
  version: string
  onOpen: () => void
  onDismiss: () => void
}): ReactNode {
  const t = useMobileTranslation()
  const theme = useDeckTheme()
  return (
    <View
      style={{
        backgroundColor: theme.color.raised,
        borderRadius: theme.radius.floating,
        padding: theme.space.md,
        gap: theme.space.xs
      }}
    >
      <Text style={{ color: theme.color.text1, fontSize: theme.text.body }}>
        {`${t('deck.update.available', 'Orcapad')} ${version} ${t('deck.update.availableSuffix', 'is ready to install.')}`}
      </Text>
      <View style={{ flexDirection: 'row', gap: theme.space.md }}>
        <FocusableOrca
          zone="shortcuts"
          id="deck-update-notice-open"
          order={0}
          onActivate={onOpen}
          accessibilityLabel={t('deck.update.open', 'Update now')}
        >
          <Text style={{ color: theme.color.accent, fontSize: theme.text.body }}>
            {t('deck.update.open', 'Update now')}
          </Text>
        </FocusableOrca>
        <FocusableOrca
          zone="shortcuts"
          id="deck-update-notice-later"
          order={1}
          onActivate={onDismiss}
          accessibilityLabel={t('deck.update.later', 'Later')}
        >
          <Text style={{ color: theme.color.text3, fontSize: theme.text.body }}>
            {t('deck.update.later', 'Later')}
          </Text>
        </FocusableOrca>
      </View>
    </View>
  )
}
