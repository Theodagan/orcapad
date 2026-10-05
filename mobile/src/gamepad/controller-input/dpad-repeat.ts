import type { ControllerIntent } from './controller-intent'
import type { ControllerButton, ControllerSample } from './controller-sample'
import { DPAD_NAVIGATION_BINDINGS } from './dpad-navigation-bindings'
import { isDown, wentDown } from './sample-edges'

/**
 * A held D-pad direction repeats like a held arrow key: a pause, then a steady rate. Without it
 * a list of fifty rows is fifty presses. The first step is the press itself, which the resolver
 * already emits; this adds only the ones after it.
 *
 * It needs samples to keep arriving while the button is held, which is the held-input pump's
 * job. Capture ends a hold, and a press made under a wheel never starts one.
 */

export type DpadRepeatTiming = {
  readonly delayMs: number
  readonly intervalMs: number
}

export type DpadRepeater = (
  previous: ControllerSample,
  next: ControllerSample,
  captured: boolean
) => readonly ControllerIntent[]

function intentOf(button: ControllerButton): ControllerIntent | null {
  const binding = DPAD_NAVIGATION_BINDINGS.find((candidate) => candidate.button === button)
  if (binding === undefined) {
    return null
  }
  if (binding.intent === 'move-selection') {
    return binding.direction === 'up' || binding.direction === 'down'
      ? { kind: 'move-selection', direction: binding.direction }
      : null
  }
  return binding.direction === 'left' || binding.direction === 'right'
    ? { kind: 'move-horizontal', direction: binding.direction }
    : null
}

export function createDpadRepeater(timing: DpadRepeatTiming): DpadRepeater {
  let held: { readonly button: ControllerButton; readonly since: number; lastAt: number } | null =
    null

  return (previous, next, captured) => {
    if (!next.connected || captured) {
      held = null
      return []
    }
    for (const { button } of DPAD_NAVIGATION_BINDINGS) {
      if (wentDown(previous, next, button)) {
        held = { button, since: next.sampledAt, lastAt: next.sampledAt }
      }
    }
    if (held === null) {
      return []
    }
    if (!isDown(next, held.button)) {
      held = null
      return []
    }
    if (
      next.sampledAt - held.since < timing.delayMs ||
      next.sampledAt - held.lastAt < timing.intervalMs
    ) {
      return []
    }
    held.lastAt = next.sampledAt
    const intent = intentOf(held.button)
    return intent === null ? [] : [intent]
  }
}
