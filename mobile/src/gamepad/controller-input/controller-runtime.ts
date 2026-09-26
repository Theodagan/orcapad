import { orcaGamepad } from '../../../modules/orca-gamepad'
import type { ControllerIntent } from './controller-intent'
import type { ControllerReader } from './controller-reader'
import type { ControllerSample } from './controller-sample'
import {
  createControllerIntentResolver,
  DEFAULT_CONTROLLER_POLICY,
  type ControllerPolicy
} from './controller-resolver'
import { createNativeControllerReader } from './native-controller-reader'
import { declaredFlat, triggersAreAnalog } from './native-controller-sample'
import type { NativeControllerDevice } from '../../../modules/orca-gamepad'

/**
 * Assembles what the shell mounts: a reader, and a resolver whose dead zones come from the
 * attached hardware rather than from a number someone liked.
 *
 * The policy is recomputed when the set of controllers changes, because a pad that arrives after
 * launch brings its own flat zones with it, and a Hall-effect stick deserves the precision it
 * declares instead of a default wide enough for a worn one.
 */

export type ControllerRuntime = {
  readonly reader: ControllerReader
  readonly resolve: (sample: ControllerSample) => readonly ControllerIntent[]
}

/** The device's own figure when it states one; the floor only covers a pad that declares none. */
export function policyForControllers(
  controllers: readonly NativeControllerDevice[]
): ControllerPolicy {
  const stick = Math.max(declaredFlat(controllers, 'left-x'), declaredFlat(controllers, 'right-x'))
  const trigger = Math.max(declaredFlat(controllers, 'l2'), declaredFlat(controllers, 'r2'))
  return {
    stickDeadZone: stick > 0 ? stick : DEFAULT_CONTROLLER_POLICY.stickDeadZone,
    triggerDeadZone: trigger > 0 ? trigger : DEFAULT_CONTROLLER_POLICY.triggerDeadZone,
    triggersAnalog: controllers.length === 0 || triggersAreAnalog(controllers),
    dpadNavigation: DEFAULT_CONTROLLER_POLICY.dpadNavigation
  }
}

export function createControllerRuntime(): ControllerRuntime {
  const reader = createNativeControllerReader()
  if (orcaGamepad === null) {
    return { reader, resolve: createControllerIntentResolver() }
  }
  const native = orcaGamepad

  let resolve = createControllerIntentResolver(policyForControllers(native.listControllers()))
  // A new resolver rather than a mutated policy: the old one's edge state belongs to the pad
  // that is leaving, and carrying it over is how a button stays held after a disconnect.
  native.addListener('onControllerDevices', ({ controllers }) => {
    resolve = createControllerIntentResolver(policyForControllers(controllers))
  })

  return { reader, resolve: (sample) => resolve(sample) }
}
