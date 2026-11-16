import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { useMobileDictation } from '../../hooks/use-mobile-dictation'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import type { RpcClient } from '../../transport/rpc/rpc-client-contract'
import { FocusableOrca } from '../focus/focusable-orca'
import { useDeckTheme } from '../theme/deck-theme'

export function DictationNotch({
  client,
  enabled,
  onText
}: {
  client: RpcClient | null
  enabled: boolean
  onText: (text: string) => void
}): ReactNode {
  const t = useMobileTranslation()
  const theme = useDeckTheme()
  const dictation = useMobileDictation({ client, enabled, onTranscript: onText })
  const active = dictation.isStarting || dictation.isRecording || dictation.isProcessing
  const status = dictation.isRecording
    ? t('deck.dictation.recording', 'Listening…')
    : dictation.isProcessing
      ? t('deck.dictation.processing', 'Transcribing…')
      : dictation.isStarting
        ? t('deck.dictation.starting', 'Starting microphone…')
        : t('deck.dictation.idle', 'Dictate')
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.sm }}>
      <FocusableOrca
        zone="list"
        id="dictation-toggle"
        order={0}
        disabled={!enabled || dictation.isStarting || dictation.isProcessing}
        onActivate={() => {
          if (dictation.isRecording) {
            void dictation.stop()
          } else {
            void dictation.start()
          }
        }}
        accessibilityLabel={status}
      >
        <Text
          style={{
            color: active ? theme.color.need : theme.color.accent,
            fontSize: theme.text.body
          }}
        >
          {dictation.isRecording ? t('deck.dictation.stop', 'Stop') : status}
        </Text>
      </FocusableOrca>
      {dictation.transcriptSoFar ? (
        <Text style={{ color: theme.color.text2, fontSize: theme.text.meta, flex: 1 }}>
          {dictation.transcriptSoFar}
        </Text>
      ) : null}
      {dictation.error ? (
        <Text style={{ color: theme.color.risk, fontSize: theme.text.meta, flex: 1 }}>
          {dictation.error}
        </Text>
      ) : null}
    </View>
  )
}
