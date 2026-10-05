import { useCallback, useRef } from 'react'
import { StyleSheet, View } from 'react-native'
import {
  useTerminalControllerBinding,
  type TerminalWheelAction
} from '../gamepad/bindings/use-terminal-controller-binding'
import { useInputVisibility } from '../gamepad/input-visibility/use-input-visibility'
import { TerminalWebView } from '../terminal/TerminalWebView'
import type {
  MobileTerminalTheme,
  TerminalKeyboardAvoidanceMetrics,
  TerminalModes,
  TerminalWebViewHandle
} from '../terminal/terminal-webview-contract'

type TerminalPaneViewProps = {
  handle: string
  active: boolean
  keyboardLift: number
  terminalTheme?: MobileTerminalTheme
  textScale: number
  onRef: (handle: string, ref: TerminalWebViewHandle | null) => void
  onWebReady: (handle: string) => void
  onSelectionMode: (handle: string, active: boolean) => void
  onSelectionCopy: (handle: string, text: string) => void
  onSelectionEvicted: (handle: string) => void
  onModesChanged: (handle: string, modes: TerminalModes) => void
  onKeyboardAvoidanceMetrics: (handle: string, metrics: TerminalKeyboardAvoidanceMetrics) => void
  onHaptic: (kind: 'selection' | 'success' | 'error' | 'edge-bump') => void
  onTerminalInput: (handle: string, bytes: string) => void
  onTerminalQueryReply: (handle: string, bytes: string) => void
  onTerminalTap: (handle: string) => void
  onFileTap: (handle: string, pathText: string, line: number | null, column: number | null) => void
  onOpenUrl: (handle: string, url: string) => void
  onTextScaleChange: (scale: number) => void
  /** Control keys and quick commands a wheel preset may name (BIND-R10). */
  controllerActions?: readonly TerminalWheelAction[]
  /** The pane on screen: active and not covered by the native chat. Only it takes controller input. */
  controllerFocused: boolean
  /** Sends bytes the way a shortcut key does, which is how the D-pad, A and B reach an agent. */
  onControllerKey: (bytes: string) => void
}

const NO_CONTROLLER_ACTIONS: readonly TerminalWheelAction[] = []

export function TerminalPaneView({
  handle,
  active,
  keyboardLift,
  terminalTheme,
  textScale,
  onRef,
  onWebReady,
  onSelectionMode,
  onSelectionCopy,
  onSelectionEvicted,
  onModesChanged,
  onKeyboardAvoidanceMetrics,
  onHaptic,
  onTerminalInput,
  onTerminalQueryReply,
  onTerminalTap,
  onFileTap,
  onOpenUrl,
  onTextScaleChange,
  controllerActions,
  controllerFocused,
  onControllerKey
}: TerminalPaneViewProps) {
  // The pane keeps its own copy of the handle purely so the controller can reach the scrollback;
  // `onRef` still hands the same ref upward exactly as before.
  const webViewRef = useRef<TerminalWebViewHandle | null>(null)
  const setRef = useCallback(
    (ref: TerminalWebViewHandle | null) => {
      webViewRef.current = ref
      onRef(handle, ref)
    },
    [handle, onRef]
  )

  const scrollLines = useCallback((lines: number) => {
    webViewRef.current?.scrollLines(lines)
  }, [])

  const input = useInputVisibility()
  useTerminalControllerBinding({
    handle,
    enabled: controllerFocused,
    editingText: input.visible,
    scrollLines,
    sendKey: onControllerKey,
    actions: controllerActions ?? NO_CONTROLLER_ACTIONS
  })

  return (
    <View
      // Why: inactive terminal WebViews stay mounted to preserve xterm state,
      // while touch and visibility are disabled until the tab is active again.
      pointerEvents={active ? 'auto' : 'none'}
      style={[
        styles.terminalPane,
        keyboardLift > 0 && { transform: [{ translateY: -keyboardLift }] },
        !active && styles.terminalPaneHidden
      ]}
    >
      <TerminalWebView
        ref={setRef}
        style={styles.terminalWebView}
        terminalTheme={terminalTheme}
        textScale={textScale}
        onWebReady={() => onWebReady(handle)}
        onSelectionMode={(a) => onSelectionMode(handle, a)}
        onSelectionCopy={(t) => onSelectionCopy(handle, t)}
        onSelectionEvicted={() => onSelectionEvicted(handle)}
        onModesChanged={(m) => onModesChanged(handle, m)}
        onKeyboardAvoidanceMetrics={(m) => onKeyboardAvoidanceMetrics(handle, m)}
        onHaptic={onHaptic}
        onTerminalInput={(bytes) => onTerminalInput(handle, bytes)}
        onTerminalQueryReply={(bytes) => onTerminalQueryReply(handle, bytes)}
        onTerminalTap={() => onTerminalTap(handle)}
        onFileTap={(pathText, line, column) => onFileTap(handle, pathText, line, column)}
        onOpenUrl={(url) => onOpenUrl(handle, url)}
        onTextScaleChange={onTextScaleChange}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  terminalPane: {
    ...StyleSheet.absoluteFillObject
  },
  terminalPaneHidden: {
    opacity: 0
  },
  terminalWebView: {
    flex: 1
  }
})
