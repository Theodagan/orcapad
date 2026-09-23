import { CHORD_BUTTON, PRD_CONTROLLER_BINDINGS } from './controller-bindings'
import type { ControllerIntent } from './controller-intent'
import type { ControllerAxis, ControllerButton, ControllerSample } from './controller-sample'
import { EXPERIMENTAL_DPAD_BINDINGS } from './experimental-dpad-bindings'

/**
 * Samples in, intents out. Pure and edge-aware: a button produces one intent when it goes down,
 * while a trigger or stick produces one per sample for as long as it is held, because scrolling
 * and wheel motion are continuous and a press is not.
 *
 * Dead zones come from the device rather than from a constant here — `ControllerPolicy.deadZone`
 * is filled from each pad's declared `MotionRange.flat`. Crossing the dead zone passes the
 * vector through untouched: rescaling would move the needle somewhere the thumb is not
 * (CTRL-R5, CTRL-AC5).
 */

export type ControllerPolicy = {
  /** Below this magnitude a stick publishes nothing. From the device, not from taste. */
  readonly stickDeadZone: number
  readonly triggerDeadZone: number
  /** False when the pad reports L2/R2 only as buttons, which fixes scroll velocity at full. */
  readonly triggersAnalog: boolean
  /** CTRL-R2 is an experiment and ships disabled. */
  readonly experimentalDpad: boolean
}

/** Floors, used when a pad declares no flat zone at all rather than a considered default. */
export const DEFAULT_CONTROLLER_POLICY: ControllerPolicy = {
  stickDeadZone: 0.15,
  triggerDeadZone: 0.1,
  triggersAnalog: true,
  experimentalDpad: false
}

function pressure(sample: ControllerSample, button: ControllerButton): number {
  return sample.buttons.get(button) ?? 0
}

function axis(sample: ControllerSample, name: ControllerAxis): number {
  return sample.axes.get(name) ?? 0
}

function isDown(sample: ControllerSample, button: ControllerButton): boolean {
  return pressure(sample, button) > 0.5
}

/** A press, not a hold: the transition is the event, so a held button does not repeat. */
function wentDown(
  previous: ControllerSample,
  next: ControllerSample,
  button: ControllerButton
): boolean {
  return !isDown(previous, button) && isDown(next, button)
}

export function resolveControllerIntents(
  previous: ControllerSample,
  next: ControllerSample,
  policy: ControllerPolicy
): readonly ControllerIntent[] {
  if (!next.connected) {
    return []
  }
  const intents: ControllerIntent[] = []
  const chordHeld = isDown(next, CHORD_BUTTON)

  for (const binding of PRD_CONTROLLER_BINDINGS) {
    if (binding.kind === 'button') {
      // The chord is read from the current sample, so releasing Y restores the plain action on
      // the very next press rather than leaving a mode behind (CTRL-R4).
      const chordMatches = binding.chord === null ? !chordHeld : isDown(next, binding.chord)
      if (!chordMatches || !wentDown(previous, next, binding.button)) {
        continue
      }
      if (binding.intent === 'cycle-tab' || binding.intent === 'cycle-workspace') {
        if (binding.direction === 'previous' || binding.direction === 'next') {
          intents.push({ kind: binding.intent, direction: binding.direction })
        }
        continue
      }
      intents.push({ kind: binding.intent })
      continue
    }

    if (binding.kind === 'trigger') {
      const value = axis(next, binding.axis)
      if (value > policy.triggerDeadZone) {
        intents.push({
          kind: 'scroll',
          direction: binding.direction,
          velocity: policy.triggersAnalog ? value : 1
        })
      }
      continue
    }

    if (binding.kind === 'stick') {
      const [horizontal, vertical] = binding.axes
      const x = axis(next, horizontal)
      const y = axis(next, vertical)
      // Squared on both sides: same predicate as comparing the magnitude, without a square
      // root on every sample of every stick.
      if (x * x + y * y > policy.stickDeadZone * policy.stickDeadZone) {
        intents.push({ kind: 'wheel-motion', wheel: binding.wheel, x, y })
      }
    }
  }

  if (policy.experimentalDpad) {
    for (const binding of EXPERIMENTAL_DPAD_BINDINGS) {
      if (!wentDown(previous, next, binding.button)) {
        continue
      }
      if (binding.intent === 'move-selection') {
        if (binding.direction === 'up' || binding.direction === 'down') {
          intents.push({ kind: 'move-selection', direction: binding.direction })
        }
        continue
      }
      if (binding.direction === 'left' || binding.direction === 'right') {
        intents.push({ kind: 'move-horizontal', direction: binding.direction })
      }
    }
  }

  return intents
}

/**
 * The stateful form the provider mounts. It holds only the previous sample, which is what makes
 * an edge detectable; everything else is in the pure resolver above.
 */
export function createControllerIntentResolver(
  policy: ControllerPolicy = DEFAULT_CONTROLLER_POLICY
): (sample: ControllerSample) => readonly ControllerIntent[] {
  let previous: ControllerSample = {
    connected: false,
    buttons: new Map(),
    axes: new Map(),
    sampledAt: 0
  }
  return (sample) => {
    const intents = resolveControllerIntents(previous, sample, policy)
    previous = sample
    return intents
  }
}
