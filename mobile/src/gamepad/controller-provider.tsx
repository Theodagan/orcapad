import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import type { ControllerIntent } from './controller-input/controller-intent'
import {
  createAbsentControllerReader,
  type ControllerReader,
  type ControllerSupport
} from './controller-input/controller-reader'
import type { ControllerSample } from './controller-input/controller-sample'
import { createFocusRegistry } from './focus/focus-registry'
import type { FocusTarget } from './focus/focus-target'
import type { WheelActionBinding } from './wheel/wheel-registry'

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
  readonly dispatchIntent: (intent: ControllerIntent) => boolean
  /**
   * BIND-R10: a mounted surface offers an action a wheel preset may name. Inert without a
   * registry above, so a surface can be rendered in a test without standing a wheel up.
   */
  readonly registerWheelAction: (binding: WheelActionBinding) => () => void
}

const ControllerContext = createContext<ControllerContextValue | null>(null)

/** No wheel above: the surface still mounts, and its action simply has nowhere to be named. */
const noWheelRegistration = (): (() => void) => () => {}

export function useController(): ControllerContextValue {
  const value = useContext(ControllerContext)
  if (value === null) {
    throw new Error('useController requires a ControllerProvider above it.')
  }
  return value
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
}

export function ControllerProvider({
  children,
  reader,
  resolve,
  wheelOverlay,
  intercept,
  registerWheelAction
}: ControllerProviderProps): ReactNode {
  const activeReader = useMemo(() => reader ?? createAbsentControllerReader(), [reader])
  const registry = useMemo(() => createFocusRegistry(), [])
  const support = useMemo(() => activeReader.support(), [activeReader])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    setConnected(activeReader.current().connected)
    return activeReader.subscribe((sample) => {
      setConnected(sample.connected)
      if (resolve === undefined) {
        return
      }
      for (const intent of resolve(sample)) {
        if (intercept?.(intent) === true) {
          continue
        }
        registry.dispatch(intent)
      }
    })
  }, [activeReader, registry, resolve, intercept])

  const value = useMemo<ControllerContextValue>(
    () => ({
      support,
      connected,
      registerFocusTarget: registry.register,
      activateFocusTarget: registry.activate,
      dispatchIntent: registry.dispatch,
      registerWheelAction: registerWheelAction ?? noWheelRegistration
    }),
    [support, connected, registry, registerWheelAction]
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
