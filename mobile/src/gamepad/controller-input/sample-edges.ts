import type { ControllerAxis, ControllerButton, ControllerSample } from './controller-sample'

/** Reading a sample, and the transitions between two of them. Every stateful rule builds on these. */

export function axisOf(sample: ControllerSample, name: ControllerAxis): number {
  return sample.axes.get(name) ?? 0
}

export function isDown(sample: ControllerSample, button: ControllerButton): boolean {
  return (sample.buttons.get(button) ?? 0) > 0.5
}

/** A press, not a hold: the transition is the event, so a held button does not repeat. */
export function wentDown(
  previous: ControllerSample,
  next: ControllerSample,
  button: ControllerButton
): boolean {
  return !isDown(previous, button) && isDown(next, button)
}

export function wentUp(
  previous: ControllerSample,
  next: ControllerSample,
  button: ControllerButton
): boolean {
  return isDown(previous, button) && !isDown(next, button)
}

/** Squared on both sides: the magnitude comparison without a square root per sample per stick. */
export function outsideDeadZone(x: number, y: number, deadZone: number): boolean {
  return x * x + y * y > deadZone * deadZone
}
