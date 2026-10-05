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
   */
  readonly requestNativeFocus: (node: View | null) => void
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
  return (node) => {
    if (Platform.OS !== 'android' || node === null || module.requestNativeFocus === undefined) {
      return
    }
    const tag = findNodeHandle(node)
    if (tag !== null) {
      module.requestNativeFocus(tag).catch(() => {})
    }
  }
}

/** The device's own figure when it states one; the floor only covers a pad that declares none. */
export function policyForControllers(
  controllers: readonly NativeControllerDevice[]
): ControllerPolicy {
  const stick = Math.max(declaredFlat(controllers, 'left-x'), declaredFlat(controllers, 'right-x'))
  const trigger = Math.max(declaredFlat(controllers, 'l2'), declaredFlat(controllers, 'r2'))
  return {
    ...DEFAULT_CONTROLLER_POLICY,
    stickDeadZone: stick > 0 ? stick : DEFAULT_CONTROLLER_POLICY.stickDeadZone,
    triggerDeadZone: trigger > 0 ? trigger : DEFAULT_CONTROLLER_POLICY.triggerDeadZone,
    triggersAnalog: controllers.length === 0 || triggersAreAnalog(controllers)
  }
}

export function createControllerRuntime(): ControllerRuntime {
  const native = createNativeControllerReader()
  if (orcaGamepad === null) {
    return {
      reader: native,
      resolve: createControllerIntentResolver(),
      setCaptured: () => {},
      requestNativeFocus: () => {}
    }
  }
  const module = orcaGamepad

  let policy = policyForControllers(module.listControllers())
  let resolve = createControllerIntentResolver(policy)
  // A new resolver rather than a mutated policy: the old one's edge state belongs to the pad
  // that is leaving, and carrying it over is how a button stays held after a disconnect.
  module.addListener('onControllerDevices', ({ controllers }) => {
    policy = policyForControllers(controllers)
    resolve = createControllerIntentResolver(policy)
  })

  return {
    reader: withHeldInputRepeat(native, {
      policy: () => policy,
      isActive: () => AppState.currentState === 'active'
    }),
    resolve: (sample, context) => resolve(sample, context),
    setCaptured: (captured) => {
      module.setInputCaptured(captured)
    },
    requestNativeFocus: nativeFocusRequester(module)
  }
}
