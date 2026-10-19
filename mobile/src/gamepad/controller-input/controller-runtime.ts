import { AppState, findNodeHandle, Platform, type View } from 'react-native'
import { orcaGamepad } from '../../../modules/orca-gamepad'
import type { ControllerReader } from './controller-reader'
import {
  createControllerIntentResolver,
  DEFAULT_CONTROLLER_POLICY,
  type ControllerPolicy,
  type ControllerResolver
} from './controller-resolver'
import { withHeldInputRepeat } from './held-input-repeat'
import type { ControllerSample } from './controller-sample'
import { multicastControllerReader } from './multicast-controller-reader'
import { createNativeControllerReader } from './native-controller-reader'
import { declaredFlat, triggersAreAnalog } from './native-controller-sample'
import type { NativeControllerDevice } from '../../../modules/orca-gamepad'

/**
 * Assembles what the shell mounts: a reader, and a resolver whose dead zones come from the
 * attached hardware rather than from a number someone liked.
 *
 * The policy is recomputed when the set of controllers changes, because a pad that arrives after
 * launch brings its own flat zones with it, and a Hall-effect stick deserves the precision it
 * declares instead of a default wide enough for a worn one. The reader shares it, since what
 * counts as held is the same question as what the resolver treats as past the dead zone.
 */

export type ControllerRuntime = {
  readonly reader: ControllerReader
  readonly resolve: ControllerResolver
  /** Stops the native layer forwarding controller keys beneath an open wheel. Inert without it. */
  readonly setCaptured: (captured: boolean) => void
  /**
   * Moves Android's own input focus onto a view, so the platform's focus highlight and
   * scroll-into-view follow the pad's cursor. Best effort, and inert without the native call.
   * `within` focuses the first control inside the view instead, which is how a sheet is entered.
   */
  readonly requestNativeFocus: (node: View | null, within?: boolean) => void
  /** Hides or restores Android system bars (status and gesture/navigation bars). Inert without native module. */
  readonly setImmersive: (enabled: boolean) => void
  /** Android's own focus, for screens no surface binds: one D-pad step, or a press on it. */
  readonly nativeFocus: NativeFocusFallback
}

export type NativeFocusFallback = {
  readonly move: (direction: 'up' | 'down' | 'left' | 'right') => void
  readonly activate: () => void
  /** Positive scrolls down, in dp. */
  readonly scroll: (delta: number) => void
}

const INERT_NATIVE_FOCUS: NativeFocusFallback = {
  move: () => {},
  activate: () => {},
  scroll: () => {}
}

function nativeFocusFallback(module: NonNullable<typeof orcaGamepad>): NativeFocusFallback {
  if (Platform.OS !== 'android') {
    return INERT_NATIVE_FOCUS
  }
  return {
    move: (direction) => {
      module.moveNativeFocus?.(direction).catch(() => {})
    },
    activate: () => {
      module.activateNativeFocus?.().catch(() => {})
    },
    scroll: (delta) => {
      module.scrollNativeBy?.(delta).catch(() => {})
    }
  }
}

/**
 * Not `View.focus()`, which React Native 0.83 honours only behind a feature flag that is off, and
 * not `AccessibilityInfo.setAccessibilityFocus`, which announces without moving focus. A view
 * that cannot take focus, a build older than this call, or another platform leaves focus where
 * it was.
 */
function nativeFocusRequester(
  module: NonNullable<typeof orcaGamepad>
): ControllerRuntime['requestNativeFocus'] {
  return (node, within = false) => {
    const request = within ? module.requestNativeFocusWithin : module.requestNativeFocus
    if (Platform.OS !== 'android' || node === null || request === undefined) {
      return
    }
    const tag = findNodeHandle(node)
    if (tag !== null) {
      request(tag).catch(() => {})
    }
  }
}

/** The device's own figure when it states one; the floor only covers a pad that declares none. */
export function policyForControllers(
  controllers: readonly NativeControllerDevice[]
): ControllerPolicy {
  const stick = Math.max(
    declaredFlat(controllers, 'left-x'),
    declaredFlat(controllers, 'left-y'),
    declaredFlat(controllers, 'right-x'),
    declaredFlat(controllers, 'right-y')
  )
  const trigger = Math.max(declaredFlat(controllers, 'l2'), declaredFlat(controllers, 'r2'))
  return {
    ...DEFAULT_CONTROLLER_POLICY,
    stickDeadZone: stick > 0 ? stick : DEFAULT_CONTROLLER_POLICY.stickDeadZone,
    triggerDeadZone: trigger > 0 ? trigger : DEFAULT_CONTROLLER_POLICY.triggerDeadZone,
    triggersAnalog: controllers.length === 0 || triggersAreAnalog(controllers)
  }
}

function samePolicy(a: ControllerPolicy, b: ControllerPolicy): boolean {
  return (
    a.stickDeadZone === b.stickDeadZone &&
    a.triggerDeadZone === b.triggerDeadZone &&
    a.triggersAnalog === b.triggersAnalog &&
    a.dpadNavigation === b.dpadNavigation &&
    a.dpadRepeatDelayMs === b.dpadRepeatDelayMs &&
    a.dpadRepeatIntervalMs === b.dpadRepeatIntervalMs
  )
}

export function createControllerRuntime(): ControllerRuntime {
  const native = createNativeControllerReader()
  if (orcaGamepad === null) {
    return {
      reader: native,
      resolve: createControllerIntentResolver(),
      setCaptured: () => {},
      requestNativeFocus: () => {},
      setImmersive: () => {},
      nativeFocus: INERT_NATIVE_FOCUS
    }
  }
  const module = orcaGamepad

  let policy = policyForControllers(module.listControllers())
  let resolve = createControllerIntentResolver(policy)
  let lastSample: ControllerSample | null = null
  // Device events fire for unrelated changes too; a rebuild seeded from neutral would read every
  // button already down as a fresh press, so only a real policy change rebuilds, from the last sample.
  module.addListener('onControllerDevices', ({ controllers }) => {
    const next = policyForControllers(controllers)
    if (samePolicy(next, policy)) {
      return
    }
    policy = next
    resolve = createControllerIntentResolver(policy, lastSample ?? undefined)
  })

  return {
    // Multicast so the provider and the wheel's disconnect watch share one held-input pump.
    reader: multicastControllerReader(
      withHeldInputRepeat(native, {
        policy: () => policy,
        isActive: () => AppState.currentState === 'active'
      })
    ),
    resolve: (sample, context) => {
      lastSample = sample
      return resolve(sample, context)
    },
    setCaptured: (captured) => {
      module.setInputCaptured(captured)
    },
    requestNativeFocus: nativeFocusRequester(module),
    nativeFocus: nativeFocusFallback(module),
    setImmersive: (enabled) => {
      if (Platform.OS === 'android' && module.setImmersive !== undefined) {
        module.setImmersive(enabled).catch(() => {})
      }
    }
  }
}
