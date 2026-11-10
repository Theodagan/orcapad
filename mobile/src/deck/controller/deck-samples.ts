import {
  neutralSample,
  type ControllerButton,
  type ControllerSample
} from '../../gamepad/controller-input/controller-sample'

/** A sample for the tests and for a caller that has buttons down and nothing else. */
export function sampleWith(
  down: readonly ControllerButton[],
  sampledAt: number,
  overrides: { readonly connected?: boolean } = {}
): ControllerSample {
  const base = neutralSample(sampledAt)
  const buttons = new Map(base.buttons)
  for (const button of down) {
    buttons.set(button, 1)
  }
  return { ...base, buttons, connected: overrides.connected ?? true }
}
