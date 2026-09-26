import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import { StyleSheet, View } from 'react-native'
import type { ControllerIntent, ControllerIntentKind } from './controller-input/controller-intent'
import {
  createAbsentControllerReader,
  type ControllerReader,
  type ControllerSupport
} from './controller-input/controller-reader'
import type { ControllerSample } from './controller-input/controller-sample'
import { createFocusRegistry } from './focus/focus-registry'
import type { FocusTarget } from './focus/focus-target'
import type { WheelActionBinding } from './wheel/wheel-registry'
import {
  shouldToggleDictation,
  type ActiveDictation,
  type ActiveDictationRegistry
} from './bindings/active-dictation'

/**
 * The controller layer's one composition point: reader lifecycle, intent dispatch, focus
 * registration, and the slot the wheel overlay mounts into.
 *
 * React context rather than a module singleton, deliberately. The predecessor bound its
 * runtime into module-level state, which made every consumer reach past the tree for it and
 * made two mounts impossible to reason about. Nothing here stores remote truth: the registry
 * holds callbacks into surfaces that already own their state (FND-R1).
 */

export type ControllerContextValue = {
  readonly support: ControllerSupport
  readonly connected: boolean
  /** Returns the unregister function; a surface calls it on unmount. */
  readonly registerFocusTarget: (target: FocusTarget) => () => void
  readonly activateFocusTarget: (id: string) => void
  /**
   * Straight to the focus registry — it does **not** consult the wheel. Only the reader
   * subscription below runs the full order in `001` §7, so anything checking what a real press
   * does has to go through a sample, not through this.
   */
  readonly dispatchIntent: (intent: ControllerIntent) => boolean
  /**
   * BIND-R10: a mounted surface offers an action a wheel preset may name. Inert without a
   * registry above, so a surface can be rendered in a test without standing a wheel up.
   */
  readonly registerWheelAction: (binding: WheelActionBinding) => () => void
  /** The mounted session's dictation, so `R3` reaches it from step 2 wherever focus is. */
  readonly registerActiveDictation: (dictation: ActiveDictation) => () => void
  /** What the focused surface answers for right now, so hints can be derived rather than authored. */
  readonly activeAccepts: ReadonlySet<ControllerIntentKind>
}

const ControllerContext = createContext<ControllerContextValue | null>(null)

/** No wheel above: the surface still mounts, and its action simply has nowhere to be named. */
const noWheelRegistration = (): (() => void) => () => {}
const noDictationRegistration = (): (() => void) => () => {}

export function useController(): ControllerContextValue {
  const value = useContext(ControllerContext)
  if (value === null) {
    throw new Error('useController requires a ControllerProvider above it.')
  }
  return value
}

/**
 * The same value, inert when no provider is above. What a binding wants: the controller layer is
 * additive, so an existing surface must still render — and still work by touch (BIND-AC10) —
 * wherever it is mounted without the shell, which is every one of its own tests.
 *
 * The absent reader next door takes the same position for the native module: without one the
 * layer is inert, never broken.
 */
const INERT_CONTROLLER: ControllerContextValue = {
  support: 'unavailable',
  connected: false,
  registerFocusTarget: () => () => {},
  activateFocusTarget: () => {},
  dispatchIntent: () => false,
  registerWheelAction: noWheelRegistration,
  registerActiveDictation: noDictationRegistration,
  activeAccepts: new Set<ControllerIntentKind>()
}

export function useControllerBinding(): ControllerContextValue {
  return useContext(ControllerContext) ?? INERT_CONTROLLER
}

export type ControllerProviderProps = {
  readonly children?: ReactNode
  /** CTRL-T4 supplies the native module; without one the layer is inert, never broken. */
  readonly reader?: ControllerReader
  /** CTRL-T3 supplies the resolver. Until then no sample becomes an intent. */
  readonly resolve?: (sample: ControllerSample) => readonly ControllerIntent[]
  /** WHEEL-T5 mounts the overlay here, above the app and outside its touch path. */
  readonly wheelOverlay?: ReactNode
  /**
   * Consulted before the focus registry, and returns true when it took the intent. Step 1 of the
   * resolution order in `001` §7: an open wheel receives wheel motion and `A` before the surface
   * underneath does.
   */
  readonly intercept?: (intent: ControllerIntent) => boolean
  /** WHEEL-T4's registry, passed in rather than reached for, so the provider owns no wheel state. */
  readonly registerWheelAction?: (binding: WheelActionBinding) => () => void
  /**
   * Step 2 of `001` §7, between the wheel and the focused surface: `R3` reaches a live
   * microphone wherever focus is. Absent means no dictation layer, and `R3` is an ordinary
   * intent.
   */
  readonly activeDictation?: ActiveDictationRegistry
}

export function ControllerProvider({
  children,
  reader,
  resolve,
  wheelOverlay,
  intercept,
  registerWheelAction,
  activeDictation
}: ControllerProviderProps): ReactNode {
  const activeReader = useMemo(() => reader ?? createAbsentControllerReader(), [reader])
  const registry = useMemo(() => createFocusRegistry(), [])
  const support = useMemo(() => activeReader.support(), [activeReader])
  const [connected, setConnected] = useState(false)
  // Mirrors the active target's capabilities into render, purely so the hint bar can read them.
  // The registry stays the source of truth; this is a copy that exists to be drawn.
  const [activeAccepts, setActiveAccepts] = useState<ReadonlySet<ControllerIntentKind>>(
    () => new Set()
  )

  const takeDictationToggle = useCallback((): boolean => {
    const dictation = activeDictation?.current()
    if (dictation == null) {
      return false
    }
    // A start needs somewhere for the words to land; a stop never does.
    if (!shouldToggleDictation(dictation.activity, registry.activeTarget()?.textTarget != null)) {
      return false
    }
    dictation.toggle()
    return true
  }, [activeDictation, registry])

  useEffect(() => {
    setConnected(activeReader.current().connected)
    return activeReader.subscribe((sample) => {
      setConnected(sample.connected)
      if (resolve === undefined) {
        return
      }
      setActiveAccepts(registry.activeTarget()?.accepts ?? new Set<ControllerIntentKind>())
      for (const intent of resolve(sample)) {
        // The resolution order of `001` §7, in the order it is written there: an open wheel,
        // then a live microphone, then the focused surface.
        if (intercept?.(intent) === true) {
          continue
        }
        if (intent.kind === 'toggle-dictation' && takeDictationToggle()) {
          continue
        }
        registry.dispatch(intent)
      }
    })
  }, [activeReader, registry, resolve, intercept, takeDictationToggle])

  const value = useMemo<ControllerContextValue>(
    () => ({
      support,
      connected,
      registerFocusTarget: registry.register,
      activateFocusTarget: registry.activate,
      dispatchIntent: registry.dispatch,
      registerWheelAction: registerWheelAction ?? noWheelRegistration,
      registerActiveDictation: activeDictation?.register ?? noDictationRegistration,
      activeAccepts: activeAccepts ?? new Set<ControllerIntentKind>()
    }),
    [support, connected, registry, registerWheelAction, activeDictation, activeAccepts]
  )

  return (
    <ControllerContext.Provider value={value}>
      <View style={styles.root}>
        {children}
        {wheelOverlay === undefined ? null : (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {wheelOverlay}
          </View>
        )}
      </View>
    </ControllerContext.Provider>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 }
})
