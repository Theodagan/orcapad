import type { ReactNode } from 'react'
import { View } from 'react-native'
import { MobileStateView } from '../../components/MobileStateView'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { saveTerminalTextScale } from '../../storage/preferences'
import { TerminalPaneView } from '../../terminal/session/TerminalPaneView'
import type { MobileSessionController } from '../../session/use-mobile-session-controller'

export function DeckTerminal({ controller }: { controller: MobileSessionController }): ReactNode {
  const t = useMobileTranslation()
  const activeTab = controller.activeSessionTab
  const handle =
    controller.activeHandle ?? (activeTab?.type === 'terminal' ? activeTab.terminal : null)
  const terminal = controller.terminals.find((candidate) => candidate.handle === handle)
  if (!terminal) {
    return (
      <MobileStateView
        title={t('deck.terminal.empty.title', 'No terminal attached')}
        message={t('deck.terminal.empty.body', 'Open an agent or terminal item in this workspace.')}
      />
    )
  }
  return (
    <View style={{ flex: 1 }}>
      <TerminalPaneView
        handle={terminal.handle}
        active
        visible
        keyboardInset={0}
        keyboardLift={0}
        title={terminal.title}
        onFrame={controller.notifyTerminalPaneFrame}
        terminalTheme={terminal.terminalTheme}
        textScale={controller.terminalTextScale}
        onTextScaleChange={(scale) => {
          controller.terminalTextScaleRevisionRef.current += 1
          controller.setTerminalTextScale(scale)
          void saveTerminalTextScale(scale)
        }}
        onRef={controller.setTerminalWebViewRef}
        onDocumentReleased={controller.releaseTerminalDocument}
        onWebReady={controller.handleTerminalWebReady}
        onCellBoxChange={controller.notifyTerminalCellBoxChange}
        onSelectionMode={controller.handleSelectionMode}
        onSelectionCopy={controller.handleSelectionCopy}
        onSelectionEvicted={controller.handleSelectionEvicted}
        onClipboardWrite={controller.handleClipboardWrite}
        onModesChanged={controller.handleModesChanged}
        onKeyboardAvoidanceMetrics={controller.handleKeyboardAvoidanceMetrics}
        onHaptic={controller.handleHaptic}
        onTerminalInput={controller.handleTerminalInput}
        onTerminalQueryReply={controller.handleTerminalQueryReply}
        onTerminalInteraction={controller.handleTerminalInteraction}
        onTerminalTap={controller.handleTerminalTap}
        onFileTap={controller.handleFileTap}
        onOpenUrl={controller.handleTerminalOpenUrl}
      />
    </View>
  )
}
