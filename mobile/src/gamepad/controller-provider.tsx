import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode
} from 'react'
import { StyleSheet, View } from 'react-native'
import type { ControllerIntent } from './controller-input/controller-intent'
import {
  createAbsentControllerReader,
  type ControllerReader,
  type ControllerSupport
} from './controller-input/controller-reader'
import type { ControllerSample } from './controller-input/controller-sample'
import type { ResolveContext } from './controller-input/controller-resolver'
import { createFocusRegistry, type FocusRegistry, type FocusSnapshot } from './focus/focus-registry'
import { createZoneItemStore, type ZoneItemStore } from './zones/zone-item-store'
import type { FocusTarget } from './focus/focus-target'
import type { WheelBinding } from './wheel/wheel-registry'
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

/** The registry's read side. Stable for the provider's life, so holding it re-renders nothing. */
export type FocusReader = Pick<FocusRegistry, 'subscribe' | 'snapshot' | 'focusZone' | 'cycleZone'>

export type DictationReader = Pick<ActiveDictationRegistry, 'subscribe' | 'current'>

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
  readonly registerWheelAction: (binding: WheelBinding) => () => void
  /** The mounted session's dictation, so `Y` reaches it from step 2 wherever focus is. */
  readonly registerActiveDictation: (dictation: ActiveDictation) => () => void
  /** Zones and what a press can reach, for the hint bar and the zone frames to draw. */
  readonly focus: FocusReader
  /** The session's dictation, read-only, so the hint bar can say "Stop" while the microphone is live. */
  readonly dictation: DictationReader
  /** Where the cursor is in the zones that are rows of buttons: the header and the shortcut keys. */
  readonly zoneItems: ZoneItemStore
  /** Moves Android's own focus onto the view the cursor is on; a no-op where there is none. */
  readonly requestNativeFocus: (node: View | null) => void
}

const ControllerContext = createContext<ControllerContextValue | null>(null)

/** No wheel above: the surface still mounts, and its action simply has nowhere to be named. */
const noWheelRegistration = (): (() => void) => () => {}
const noDictationRegistration = (): (() => void) => () => {}
const noNativeFocus = (): void => {}

const INERT_SNAPSHOT: FocusSnapshot = {
  zones: [],
  focusedZone: null,
  nextZone: null,
  reachable: new Set(),
  labels: {}
}

const INERT_DICTATION: DictationReader = { subscribe: () => () => {}, current: () => null }

const INERT_ZONE_ITEMS: ZoneItemStore = {
  register: () => () => {},
  isFocused: () => false,
  selectedId: () => null,
  subscribe: () => () => {}
}

const INERT_FOCUS: FocusReader = {
  subscribe: () => () => {},
  snapshot: () => INERT_SNAPSHOT,
  focusZone: () => {},
  cycleZone: () => null
}

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
  focus: INERT_FOCUS,
  dictation: INERT_DICTATION,
  zoneItems: INERT_ZONE_ITEMS,
  requestNativeFocus: () => {}
}

export function useControllerBinding(): ControllerContextValue {
  return useContext(ControllerContext) ?? INERT_CONTROLLER
}

/** Re-renders only when focus itself changes: a zone moved, or a surface mounted or left. */
export function useFocusSnapshot(): FocusSnapshot {
  const { focus } = useControllerBinding()
  return useSyncExternalStore(focus.subscribe, focus.snapshot, focus.snapshot)
}

/** Re-renders when the session's dictation appears, goes, or changes state. */
export function useActiveDictation(): ActiveDictation | null {
  const { dictation } = useControllerBinding()
  return useSyncExternalStore(dictation.subscribe, dictation.current, dictation.current)
}

export type ControllerProviderProps = {
  readonly children?: ReactNode
  /** CTRL-T4 supplies the native module; without one the layer is inert, never broken. */
  readonly reader?: ControllerReader
  /** CTRL-T3 supplies the resolver. Until then no sample becomes an intent. */
  readonly resolve?: (
    sample: ControllerSample,
    context: ResolveContext
  ) => readonly ControllerIntent[]
  /** WHEEL-T5 mounts the overlay here, above the app and outside its touch path. */
  readonly wheelOverlay?: ReactNode
  /**
   * Consulted before the focus registry, and returns true when it took the intent. Step 1 of the
   * resolution order in `001` §7: an open wheel takes every intent, so nothing reaches the
   * surface underneath (`005` USE-R11).
   */
  readonly intercept?: (intent: ControllerIntent) => boolean
  /** True while an open wheel owns the pad. The resolver reads it, so a press that began under a wheel never acts once it closes. */
  readonly captured?: () => boolean
  /** WHEEL-T4's registry, passed in rather than reached for, so the provider owns no wheel state. */
  readonly registerWheelAction?: (binding: WheelBinding) => () => void
  /**
   * Step 2 of `001` §7, between the wheel and the focused surface: `Y` reaches the session's
   * dictation wherever focus is. Absent means no dictation layer, and `Y` is an ordinary intent.
   */
  readonly activeDictation?: ActiveDictationRegistry
  /** The runtime's native focus request. Absent means the cursor is drawn but Android's focus stays put. */
  readonly requestNativeFocus?: (node: View | null) => void
}

export function ControllerProvider({
  children,
  reader,
  resolve,
  wheelOverlay,
  intercept,
  captured,
  registerWheelAction,
  activeDictation,
  requestNativeFocus
}: ControllerProviderProps): ReactNode {
  const activeReader = useMemo(() => reader ?? createAbsentControllerReader(), [reader])
  const registry = useMemo(() => createFocusRegistry(), [])
  const support = useMemo(() => activeReader.support(), [activeReader])
  const [connected, setConnected] = useState(false)

  const takeDictationToggle = useCallback((): boolean => {
    const dictation = activeDictation?.current()
    if (dictation == null) {
      return false
    }
    // A start needs somewhere for the words to land; a stop never does. A refused start is said
    // out loud and spent here, rather than handed to a surface that has no idea what it means.
    if (!shouldToggleDictation(dictation.activity, dictation.canStart)) {
      dictation.onUnavailable()
      return true
    }
    dictation.toggle()
    return true
  }, [activeDictation])

  useEffect(() => {
    setConnected(activeReader.current().connected)
    return activeReader.subscribe((sample) => {
      setConnected(sample.connected)
      if (resolve === undefined) {
        return
      }
      for (const intent of resolve(sample, { captured: captured?.() === true })) {
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
  }, [activeReader, registry, resolve, intercept, captured, takeDictationToggle])

  const focus = useMemo<FocusReader>(
    () => ({
      subscribe: registry.subscribe,
      snapshot: registry.snapshot,
      focusZone: registry.focusZone,
      cycleZone: registry.cycleZone
    }),
    [registry]
  )

  const zoneItems = useMemo(() => createZoneItemStore(registry), [registry])

  const dictation = useMemo<DictationReader>(
    () => activeDictation ?? INERT_DICTATION,
    [activeDictation]
  )

  const value = useMemo<ControllerContextValue>(
    () => ({
      support,
      connected,
      registerFocusTarget: registry.register,
      activateFocusTarget: registry.activate,
      dispatchIntent: registry.dispatch,
      registerWheelAction: registerWheelAction ?? noWheelRegistration,
      registerActiveDictation: activeDictation?.register ?? noDictationRegistration,
      focus,
      dictation,
      zoneItems,
      requestNativeFocus: requestNativeFocus ?? noNativeFocus
    }),
    [
      support,
      connected,
      registry,
      registerWheelAction,
      activeDictation,
      focus,
      dictation,
      zoneItems,
      requestNativeFocus
    ]
  )

  return (
    <ControllerContext.Provider value={value}>
      <View style={styles.root}>
        {children}
        {wheelOverlay === undefined ? null : (
          <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
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
