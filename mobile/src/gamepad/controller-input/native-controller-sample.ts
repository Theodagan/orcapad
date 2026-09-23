import type { NativeControllerDevice, NativeControllerSample } from '../../../modules/orca-gamepad'
import {
  CONTROLLER_AXES,
  CONTROLLER_BUTTONS,
  type ControllerAxis,
  type ControllerButton,
  type ControllerSample
} from './controller-sample'

/**
 * Turns the native module's payloads into the shape the controller layer reads. Type-only
 * imports from the module on purpose: this is where the interesting decisions live, so it must
 * stay testable without the native module — and importing its value would drag React Native's
 * Flow sources into the test runner.
 *
 * Nothing here applies a dead zone. The device declares its own flat zone and the resolver owns
 * the policy, so both pass through untouched (CTRL-R5).
 */

/**
 * Driven by our own vocabulary rather than by the payload's keys: a name this build has no
 * meaning for is dropped instead of guessed at, and the iteration is already typed, so no
 * assertion is needed to narrow a string into a member.
 */
function knownButtons(
  raw: Readonly<Record<string, number>>
): ReadonlyMap<ControllerButton, number> {
  const entries = new Map<ControllerButton, number>()
  for (const button of CONTROLLER_BUTTONS) {
    const value = raw[button]
    if (value !== undefined) {
      entries.set(button, value)
    }
  }
  return entries
}

function knownAxes(raw: Readonly<Record<string, number>>): ReadonlyMap<ControllerAxis, number> {
  const entries = new Map<ControllerAxis, number>()
  for (const axis of CONTROLLER_AXES) {
    const value = raw[axis]
    if (value !== undefined) {
      entries.set(axis, value)
    }
  }
  return entries
}

export function toControllerSample(native: NativeControllerSample): ControllerSample {
  return {
    connected: native.connected,
    buttons: knownButtons(native.buttons),
    axes: knownAxes(native.axes),
    sampledAt: native.sampledAt
  }
}

/** The widest flat zone any attached pad declares, so one policy covers a mixed set. */
export function declaredFlat(
  controllers: readonly NativeControllerDevice[],
  axis: ControllerAxis
): number {
  return controllers.reduce((widest, controller) => Math.max(widest, controller.flat[axis] ?? 0), 0)
}

/** Analog only when every attached pad declares a trigger axis; one digital pad makes it digital. */
export function triggersAreAnalog(controllers: readonly NativeControllerDevice[]): boolean {
  return controllers.length > 0 && controllers.every((controller) => controller.hasAnalogTriggers)
}
