import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { Translate } from '../../i18n/mobile-i18n'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { useDeckTheme } from '../theme/deck-theme'
import type { DeckUpdateState } from './deck-update-store'

/**
 * DECK-R47/R49: installed and latest versions, one button per step, progress while it downloads,
 * and every failure in the words the host gave it. Pad reaches each control through `FocusableOrca`
 * at the call site; the panel itself is the same for a finger.
 */
export function DeckUpdatePanel({
  state,
  onCheck,
  onDownload,
  onInstall
}: {
  state: DeckUpdateState
  onCheck: () => void
  onDownload: () => void
  onInstall: () => void
}): ReactNode {
  const t = useMobileTranslation()
  const theme = useDeckTheme()
  const latest = 'release' in state ? state.release.version : null
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
        {t('deck.update.title', 'App update')}
      </Text>
      <Text style={{ color: theme.color.text2, fontSize: theme.text.body }}>
        {t('deck.update.installed', 'Installed')}: {state.installedVersion}
      </Text>
      {latest === null ? null : (
        <Text style={{ color: theme.color.text2, fontSize: theme.text.body }}>
          {t('deck.update.latest', 'Latest')}: {latest}
        </Text>
      )}
      {state.kind === 'downloading' ? (
        <Text style={{ color: theme.color.text2, fontSize: theme.text.meta }}>
          {`${Math.round((state.receivedBytes / Math.max(state.totalBytes, 1)) * 100)}%`}
        </Text>
      ) : null}
      {state.kind === 'error' ? (
        <Text style={{ color: theme.color.risk, fontSize: theme.text.body }}>
          {errorText(t, state.error.kind, 'detail' in state.error ? state.error.detail : null)}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: theme.space.sm }}>
        <PanelButton
          label={t('deck.update.check', 'Check for updates')}
          onPress={onCheck}
          disabled={state.kind === 'checking' || state.kind === 'downloading'}
        />
        <PanelButton
          label={t('deck.update.download', 'Update')}
          onPress={onDownload}
          disabled={state.kind !== 'available'}
        />
        <PanelButton
          label={t('deck.update.install', 'Install')}
          onPress={onInstall}
          disabled={state.kind !== 'ready'}
        />
      </View>
    </View>
  )
}

function PanelButton({
  label,
  onPress,
  disabled
}: {
  label: string
  onPress: () => void
  disabled: boolean
}): ReactNode {
  const theme = useDeckTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        borderRadius: theme.radius.control,
        paddingHorizontal: theme.space.md,
        paddingVertical: theme.space.sm,
        backgroundColor: disabled ? theme.color.raised : theme.color.accent,
        opacity: disabled ? theme.feedback.disabledOpacity : 1
      }}
    >
      <Text
        style={{
          color: disabled ? theme.color.text3 : theme.color.onAccent,
          fontSize: theme.text.body
        }}
      >
        {label}
      </Text>
    </Pressable>
  )
}

/** Every failure says what happened: the host's own words where there are any. */
function errorText(
  t: Translate,
  kind: 'check' | 'download' | 'install' | 'cancelled',
  detail: unknown
): string {
  // A check failure carries the host's sentence; a download or install carries a coded reason.
  const said =
    typeof detail === 'string'
      ? detail
      : typeof detail === 'object' && detail !== null && 'detail' in detail
        ? String(detail.detail)
        : typeof detail === 'object' && detail !== null && 'reason' in detail
          ? String(detail.reason)
          : typeof detail === 'object' && detail !== null && 'kind' in detail
            ? String(detail.kind)
            : ''
  switch (kind) {
    case 'check':
      return `${t('deck.update.checkFailed', 'The update check failed')}: ${said}`
    case 'download':
      return `${t('deck.update.downloadFailed', 'The download failed')}: ${said}`
    case 'install':
      return `${t('deck.update.installFailed', 'Android did not install it')}: ${said}`
    case 'cancelled':
      return t('deck.update.cancelled', 'Download cancelled.')
  }
}
