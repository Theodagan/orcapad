import { useEffect, useMemo, type ReactNode } from 'react'
import { View, type LayoutChangeEvent } from 'react-native'
import { useGlobalSearchParams, usePathname, useRouter, useSegments } from 'expo-router'
import { colors } from '../theme/mobile-theme'
import { themedStyleSheet } from '../theme/themed-styles'
import { ControllerProvider } from './controller-provider'
import { ControllerConnectionNotice } from './controller-connection/ControllerConnectionNotice'
import { ControllerNoticeStack } from './ControllerNoticeStack'
import { ActionHintBar } from './ActionHintBar'
import { createControllerRuntime } from './controller-input/controller-runtime'
import { useCancelWheelOnDisconnect } from './wheel/use-cancel-wheel-on-disconnect'
import { WheelOverlay } from './wheel/WheelOverlay'
import { useWheelController } from './wheel/use-wheel-controller'
import { createWheelRegistry, type WheelBinding, type WheelRegistry } from './wheel/wheel-registry'
import { createActiveDictationRegistry } from './bindings/active-dictation'
import { wheelLayoutsFor, wheelScreenFor, type WheelScreen } from './wheel/wheel-layouts'
import {
  goWheelActions,
  pagesWheelMenu,
  workspaceOfRoute,
  type WorkspacePage
} from './bindings/go-wheel-actions'
import { useNativeFocusFallbackBinding } from './bindings/use-native-focus-fallback-binding'
import { ActionRefusalNotice } from './action-refusal/ActionRefusalNotice'
import { createActionRefusalStore, refusalMessageFor } from './action-refusal/action-refusal-store'
import { triggerError } from '../platform/haptics'
import { useRootBackBinding } from './bindings/use-root-back-binding'
import { useFocusModeSystemBars } from './session-chrome/use-focus-mode-system-bars'
import type { ControllerIntent } from './controller-input/controller-intent'

/**
 * Everything the pad adds around the app's screens, kept out of the root layout so that layout
 * stays the upstream one and stick motion never re-renders the navigator.
 */

// One per process: the reader holds a native subscription and the resolver holds the button
// edge state, so rebuilding either on a re-render would swallow presses.
const controllerRuntime = createControllerRuntime()
// One registry per process, like the runtime: surfaces register into it as they mount.
const wheelRegistry = createWheelRegistry()
// Dictation is step 2 of `001` §7, so the mounted session's dictation registers here rather than
// being dispatched to: a live microphone stays stoppable from wherever focus has gone (unless a
// wheel is open, which takes every input first).
const activeDictation = createActiveDictationRegistry()
const actionRefusals = createActionRefusalStore()

/** Start or Select with nothing to run: felt and said, never silent. */
function refuseAction(actionId: string): void {
  triggerError()
  actionRefusals.show(refusalMessageFor(actionId))
}

/** `B` leaves any screen that has no use for it, which is most of them. Must sit inside the provider. */
function RootBackBinding(): null {
  const router = useRouter()
  useRootBackBinding({
    goBack: () => {
      if (!router.canGoBack()) {
        return false
      }
      router.back()
      return true
    }
  })
  return null
}

/** Focus mode hides the system bars. Must sit inside the provider. */
function FocusModeSystemBars(): null {
  useFocusModeSystemBars(controllerRuntime.setImmersive)
  return null
}

const WORKSPACE_PAGE_PATH: Record<WorkspacePage, string> = {
  files: '/h/[hostId]/files/[worktreeId]',
  changes: '/h/[hostId]/source-control/[worktreeId]',
  history: '/h/[hostId]/agent-history/[worktreeId]'
}

/** GO's shell-owned slots, which need only the router and the route's own params. */
function useGoWheelActions(
  registry: WheelRegistry,
  screen: WheelScreen,
  segments: readonly string[],
  pathname: string
): void {
  const router = useRouter()
  const { hostId, worktreeId, name, executionHost } = useGlobalSearchParams<{
    hostId?: string
    worktreeId?: string
    name?: string
    executionHost?: string
  }>()
  const workspace = workspaceOfRoute(segments)
  const page = workspace?.page ?? null
  const inWorkspace = workspace !== null
  useEffect(() => {
    const host = typeof hostId === 'string' ? hostId : null
    const bindings: readonly WheelBinding[] = goWheelActions({
      screen,
      hostId: host,
      atSettings: pathname === '/settings',
      canGoBack: router.canGoBack(),
      workspace: inWorkspace ? { page } : null,
      onBack: () => router.back(),
      onNewWorktree: () => {
        if (host !== null) {
          router.push(`/h/${encodeURIComponent(host)}/new-workspace`)
        }
      },
      onWorkspacePage: (target) => {
        if (host === null || typeof worktreeId !== 'string') {
          return
        }
        router.push({
          pathname: WORKSPACE_PAGE_PATH[target],
          params: {
            hostId: host,
            worktreeId,
            name: typeof name === 'string' ? name : '',
            ...(typeof executionHost === 'string' ? { executionHost } : {})
          }
        })
      },
      onSettings: () => router.push('/settings')
    })
    const unregister = [...bindings, pagesWheelMenu(registry.lookup)].map((binding) =>
      registry.register(binding)
    )
    return () => {
      for (const retract of unregister) {
        retract()
      }
    }
  }, [
    hostId,
    worktreeId,
    name,
    executionHost,
    inWorkspace,
    page,
    pathname,
    screen,
    registry,
    router
  ])
}

/**
 * T26: the deck owns the pad on its own routes. Its dispatcher answers with the deck's own table,
 * so this shell must not also read a press — no GO/DO wheel, no back binding, no Android focus
 * fallback and no hint strip — or one press would be two gestures. The deck's route prefix is
 * named here rather than imported: Orca does not import the deck (DECK-R40).
 */
const DECK_ROUTE_PREFIX = '/deck'
const NO_INTENTS = (): readonly ControllerIntent[] => []

function deckOwnsInput(pathname: string): boolean {
  return pathname === DECK_ROUTE_PREFIX || pathname.startsWith(`${DECK_ROUTE_PREFIX}/`)
}

/** D-pad and `A` through Android's own focus on screens with no pad zones. Inside the provider. */
function NativeFocusFallback(): null {
  useNativeFocusFallbackBinding(controllerRuntime.nativeFocus)
  return null
}

export function ControllerShell({
  children,
  onLayout
}: {
  readonly children: ReactNode
  readonly onLayout?: (event: LayoutChangeEvent) => void
}): ReactNode {
  const pathname = usePathname()
  const segments = useSegments()
  const screen = wheelScreenFor(segments)
  const deckOnly = deckOwnsInput(pathname)
  // GO on the left stick and, in a session, DO on the right (`012`).
  const wheel = useWheelController({
    // No preset, no wheel: on a deck route the deck's own dispatcher is the only reader.
    presets: deckOnly ? {} : wheelLayoutsFor(screen),
    registry: wheelRegistry,
    deadZone: 0.15,
    // An open wheel owns the pad: Android must not also move its own focus underneath it.
    onOpenChange: controllerRuntime.setCaptured
  })
  // A pad that drops mid-gesture must not leave an open wheel swallowing the screen.
  useCancelWheelOnDisconnect(controllerRuntime.reader, wheel.cancel)
  useGoWheelActions(wheelRegistry, screen, segments, pathname)
  const overlay = useMemo(
    () => (deckOnly ? null : <WheelOverlay controller={wheel} />),
    [deckOnly, wheel]
  )

  return (
    <ControllerProvider
      reader={controllerRuntime.reader}
      resolve={deckOnly ? NO_INTENTS : controllerRuntime.resolve}
      intercept={wheel.intercept}
      captured={wheel.isOpen}
      registerWheelAction={wheelRegistry.register}
      lookupWheelAction={wheelRegistry.lookup}
      onActionRefused={refuseAction}
      activeDictation={activeDictation}
      requestNativeFocus={controllerRuntime.requestNativeFocus}
      wheelOverlay={overlay}
    >
      <View style={styles.root} onLayout={onLayout}>
        {children}
      </View>
      {deckOnly ? null : <RootBackBinding />}
      {deckOnly ? null : <NativeFocusFallback />}
      <FocusModeSystemBars />
      {deckOnly ? null : (
        <ActionHintBar
          wheel={wheel.view}
          actions={wheelRegistry}
          reader={controllerRuntime.reader}
        />
      )}
      <ControllerNoticeStack>
        <ControllerConnectionNotice />
        <ActionRefusalNotice store={actionRefusals} />
      </ControllerNoticeStack>
    </ControllerProvider>
  )
}

const styles = themedStyleSheet(() => ({
  root: {
    flex: 1,
    backgroundColor: colors.bgBase
  }
}))
