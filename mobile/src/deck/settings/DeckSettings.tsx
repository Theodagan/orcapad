import { useEffect, useState, type ReactNode } from 'react'
import { ScrollView, Text } from 'react-native'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { DeckShell } from '../DeckShell'
import { DeckUpdatePanel } from '../updates/DeckUpdatePanel'
import { deckUpdateStore, useDeckUpdate } from '../updates/deck-update-runtime'
import { loadInstallExplainerShown, saveInstallExplainerShown } from '../updates/install-explainer'
import { InstallPermissionExplainer } from '../updates/install-permission-explainer'
import { useDeckTheme } from '../theme/deck-theme'

/**
 * DECK-R47: the settings surface that exists today — the update flow T19–T23 built, wired to the
 * store, its permissions explainer and Android's own install screen. The remaining sections arrive
 * with T92; nothing here is a placeholder pretending to be a setting.
 */
export function DeckSettings(): ReactNode {
  const t = useMobileTranslation()
  const theme = useDeckTheme()
  const state = useDeckUpdate()
  const [explainerShown, setExplainerShown] = useState<boolean | null>(null)

  useEffect(() => {
    let live = true
    void loadInstallExplainerShown().then((shown) => {
      if (live) {
        setExplainerShown(shown)
      }
    })
    return () => {
      live = false
    }
  }, [])

  const openSettings = (): void => {
    void deckUpdateStore.openInstallPermissionSettings().catch(() => {})
    void saveInstallExplainerShown()
    setExplainerShown(true)
  }

  const installing =
    state.kind === 'ready' || state.kind === 'install-reported' || state.kind === 'installing'

  return (
    <DeckShell>
      <ScrollView contentContainerStyle={{ padding: theme.space.lg, gap: theme.space.lg }}>
        <Text style={{ color: theme.color.text1, fontSize: theme.text.pageTitle }}>
          {t('deck.settings.title', 'Settings')}
        </Text>
        {installing && explainerShown === false ? (
          <InstallPermissionExplainer
            onOpenSettings={openSettings}
            onDismiss={() => {
              void saveInstallExplainerShown()
              setExplainerShown(true)
            }}
          />
        ) : null}
        <DeckUpdatePanel
          state={state}
          onCheck={() => {
            void deckUpdateStore.check()
          }}
          onDownload={() => {
            void deckUpdateStore.download()
          }}
          onCancel={() => deckUpdateStore.cancel()}
          onInstall={() => {
            void deckUpdateStore.install()
          }}
          onOpenSettings={openSettings}
          onCloseReport={() => deckUpdateStore.closeInstallReport()}
        />
      </ScrollView>
    </DeckShell>
  )
}
