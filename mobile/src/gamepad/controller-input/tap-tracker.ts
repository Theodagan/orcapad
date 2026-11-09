import { PRD_CONTROLLER_BINDINGS, TAP_MAX_MS, type ButtonBinding } from './controller-bindings'
import { buttonIntent } from './binding-intent'
import type { ControllerIntent } from './controller-intent'
import {
  CONTROLLER_BUTTONS,
  type ControllerButton,
  type ControllerSample
} from './controller-sample'
import { isDown, wentDown, wentUp } from './sample-edges'

/**
 * Bindings that fire on release, for a button that is also a modifier (`005` USE-R7). `Y` cannot
 * say whether it is a tap or the start of a chord until it comes up, so a tap is the only thing
 * it can be on release: down and up alone, quickly, and with no wheel in the way.
 *
 * Any other button going down while it is held spends it, which is what keeps `Y`+`LB` from also
 * toggling dictation. A press that began under an open wheel never fires after it closes.
 */

const TAP_BINDINGS: readonly ButtonBinding[] = PRD_CONTROLLER_BINDINGS.flatMap((binding) =>
  binding.kind === 'button' && binding.timing === 'tap' && binding.chord === null ? [binding] : []
)

function anotherWentDown(
  previous: ControllerSample,
  next: ControllerSample,
  button: ControllerButton
): boolean {
  return CONTROLLER_BUTTONS.some((other) => other !== button && wentDown(previous, next, other))
}

function anotherHeld(sample: ControllerSample, button: ControllerButton): boolean {
  return CONTROLLER_BUTTONS.some((other) => other !== button && isDown(sample, other))
}

export type TapTracker = (
  previous: ControllerSample,
  next: ControllerSample,
  captured: boolean
) => readonly ControllerIntent[]

export function createTapTracker(): TapTracker {
  const downAt = new Map<ControllerButton, number>()
  // Presses something else claimed, so their release must not fire.
  const spent = new Set<ControllerButton>()

  return (previous, next, captured) => {
    if (!next.connected) {
      downAt.clear()
      spent.clear()
      return []
    }
    const intents: ControllerIntent[] = []
    for (const binding of TAP_BINDINGS) {
      const { button } = binding
      const claimed = anotherWentDown(previous, next, button)
      if (wentDown(previous, next, button)) {
        downAt.set(button, next.sampledAt)
        // Pressed under a wheel, or with something already held: a chord partner, not a lone tap.
        if (captured || anotherHeld(next, button)) {
          spent.add(button)
        }
      } else if (downAt.has(button) && claimed) {
        spent.add(button)
      }
      if (!wentUp(previous, next, button)) {
        continue
      }
      const pressedAt = downAt.get(button)
      const quick = pressedAt !== undefined && next.sampledAt - pressedAt <= TAP_MAX_MS
      const fires = quick && !captured && !claimed && !spent.has(button)
      downAt.delete(button)
      spent.delete(button)
      const intent = fires ? buttonIntent(binding) : null
      if (intent !== null) {
        intents.push(intent)
      }
    }
    return intents
  }
}
