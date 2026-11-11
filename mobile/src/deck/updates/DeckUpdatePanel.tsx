import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import type { Translate } from '../../i18n/mobile-i18n'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { FocusableOrca, FocusableOrcaRow } from '../focus/focusable-orca'
import { useDeckTheme } from '../theme/deck-theme'
import { RESULT_CANCELED, RESULT_OK, type InstallFailure } from './apk-installer'
import type { DeckUpdateError, DeckUpdateState } from './deck-update-store'
import type { DownloadError } from './download-update'

/**
 * DECK-R47/R49: installed and latest versions, one control per step, progress while it downloads,
 * and every failure in the words the host gave it. Each control is its own `ZoneItem`, so the D-pad
 * reaches it — a focusable panel is not a focusable set of buttons.
 */
export function DeckUpdatePanel({
  state,
  onCheck,
  onDownload,
  onCancel,
  onInstall,
  onOpenSettings,
  onCloseReport
}: {
  state: DeckUpdateState
  onCheck: () => void
  onDownload: () => void
  onCancel: () => void
  onInstall: () => void
  onOpenSettings: () => void
  onCloseReport: () => void
}): ReactNode {
  const t = useMobileTranslation()
  const theme = useDeckTheme()
  const latest = 'release' in state ? state.release.version : null
  const downloading = state.kind === 'downloading'
  const installing = state.kind === 'installing'
  const installable = state.kind === 'ready' || state.kind === 'install-reported'
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
          {t('deck.update.progress', '{{percent}}% of {{total}} MB', {
            percent: Math.round((state.receivedBytes / Math.max(state.totalBytes, 1)) * 100),
            total: (state.totalBytes / (1024 * 1024)).toFixed(1)
          })}
        </Text>
      ) : null}
      {state.kind === 'install-reported' ? (
        <Text style={{ color: theme.color.text2, fontSize: theme.text.body }}>
          {installReportText(t, state.resultCode)}
        </Text>
      ) : null}
      {installable ? (
        <Text style={{ color: theme.color.text3, fontSize: theme.text.meta }}>
          {t(
            'deck.update.kept',
            'The downloaded update stays cached until it is installed or the system clears it.'
          )}
        </Text>
      ) : null}
      {state.kind === 'error' ? (
        <Text style={{ color: theme.color.risk, fontSize: theme.text.body }}>
          {updateErrorText(t, state.error)}
        </Text>
      ) : null}
      <FocusableOrcaRow>
        <PanelButton
          id="deck-update-check"
          order={0}
          label={t('deck.update.check', 'Check for updates')}
          onPress={onCheck}
          disabled={state.kind === 'checking' || downloading || installing}
        />
        <PanelButton
          id="deck-update-download"
          order={1}
          label={t('deck.update.download', 'Update')}
          onPress={onDownload}
          disabled={state.kind !== 'available'}
        />
        <PanelButton
          id="deck-update-install"
          order={2}
          label={t('deck.update.install', 'Install')}
          onPress={onInstall}
          disabled={!installable || installing}
        />
        <PanelButton
          id="deck-update-cancel"
          order={3}
          label={t('deck.update.cancel', 'Cancel download')}
          onPress={onCancel}
          disabled={!downloading}
        />
        <PanelButton
          id="deck-update-settings"
          order={4}
          label={t('deck.update.openSettings', 'Android install settings')}
          onPress={onOpenSettings}
          disabled={false}
        />
        {state.kind === 'install-reported' ? (
          <PanelButton
            id="deck-update-done"
            order={5}
            label={t('deck.update.done', 'Done')}
            onPress={onCloseReport}
            disabled={false}
          />
        ) : null}
      </FocusableOrcaRow>
    </View>
  )
}

function PanelButton({
  id,
  order,
  label,
  onPress,
  disabled
}: {
  id: string
  order: number
  label: string
  onPress: () => void
  disabled: boolean
}): ReactNode {
  return (
    <FocusableOrca
      zone="list"
      id={id}
      order={order}
      disabled={disabled}
      onActivate={onPress}
      accessibilityLabel={label}
    >
      <ButtonFace label={label} disabled={disabled} />
    </FocusableOrca>
  )
}

/** The drawn control: `FocusableOrca` owns the pad and the finger, this owns the look. */
function ButtonFace({ label, disabled }: { label: string; disabled: boolean }): ReactNode {
  const theme = useDeckTheme()
  return (
    <View
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
    </View>
  )
}

/** What Android's installer reported. A result code is a report, so the wording never says installed. */
export function installReportText(t: Translate, resultCode: number): string {
  if (resultCode === RESULT_OK) {
    return t(
      'deck.update.reportOk',
      'Android’s installer reports it finished. Reopen Orcapad to use the new version.'
    )
  }
  if (resultCode === RESULT_CANCELED) {
    return t(
      'deck.update.reportCancelled',
      'Android’s installer reports the install was cancelled. The download is kept; try again when you want.'
    )
  }
  return t('deck.update.reportOther', 'Android’s installer reports result code {{code}}.', {
    code: resultCode
  })
}

/** Every failure says what happened, in the platform's words where there are any. */
export function updateErrorText(t: Translate, error: DeckUpdateError): string {
  switch (error.kind) {
    case 'check':
      return `${t('deck.update.checkFailed', 'The update check failed')}: ${error.detail}`
    case 'download':
      return `${t('deck.update.downloadFailed', 'The download failed')}: ${downloadDetailText(t, error.detail)}`
    case 'install':
      return `${t('deck.update.installFailed', 'Android did not take the file')}: ${installDetailText(t, error.detail)}`
    case 'cancelled':
      return t('deck.update.cancelled', 'Download cancelled.')
  }
}

function downloadDetailText(t: Translate, detail: DownloadError): string {
  switch (detail.kind) {
    case 'size':
      return t(
        'deck.update.sizeMismatch',
        'the file is {{received}} bytes, the release {{expected}}',
        { received: detail.received, expected: detail.expected }
      )
    case 'digest':
      return t(
        'deck.update.digestMismatch',
        'the file’s checksum {{received}} is not the release’s {{expected}}',
        { received: detail.received, expected: detail.expected }
      )
    case 'unverifiable':
      return t('deck.update.unverifiable', 'the release publishes no checksum to compare against')
    case 'cancelled':
      return t('deck.update.cancelled', 'Download cancelled.')
    case 'failed':
      return detail.reason
  }
}

function installDetailText(t: Translate, detail: InstallFailure): string {
  switch (detail.kind) {
    case 'size':
      return t(
        'deck.update.sizeMismatch',
        'the file is {{received}} bytes, the release {{expected}}',
        { received: detail.received, expected: detail.expected }
      )
    case 'digest':
      return t(
        'deck.update.digestMismatch',
        'the file’s checksum {{received}} is not the release’s {{expected}}',
        { received: detail.received, expected: detail.expected }
      )
    case 'file-gone':
      return t('deck.update.fileGone', 'the download is gone; fetch it again')
    case 'unlaunchable':
      return detail.reason
  }
}
