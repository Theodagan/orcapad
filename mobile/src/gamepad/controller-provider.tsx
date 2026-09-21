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
}

const ControllerContext = createContext<ControllerContextValue | null>(null)

export function useController(): ControllerContextValue {
  const value = useContext(ControllerContext)
  if (value === null) {
    throw new Error('useController requires a ControllerProvider above it.')
  }
  return value
}

export type ControllerProviderProps = {
  readonly children: ReactNode
  /** CTRL-T4 supplies the native module; without one the layer is inert, never broken. */
  readonly reader?: ControllerReader
  /** CTRL-T3 supplies the resolver. Until then no sample becomes an intent. */
  readonly resolve?: (sample: ControllerSample) => readonly ControllerIntent[]
  /** WHEEL-T5 mounts the overlay here, above the app and outside its touch path. */
  readonly wheelOverlay?: ReactNode
}

export function ControllerProvider({
  children,
  reader,
  resolve,
  wheelOverlay
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
        registry.dispatch(intent)
      }
    })
  }, [activeReader, registry, resolve])

  const value = useMemo<ControllerContextValue>(
    () => ({
      support,
      connected,
      registerFocusTarget: registry.register,
      activateFocusTarget: registry.activate,
      dispatchIntent: registry.dispatch
    }),
    [support, connected, registry]
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
