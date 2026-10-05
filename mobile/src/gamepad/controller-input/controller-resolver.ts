import { CHORD_BUTTON, PRD_CONTROLLER_BINDINGS } from './controller-bindings'
import { buttonIntent } from './binding-intent'
import type { ControllerIntent } from './controller-intent'
import { neutralSample, type ControllerSample } from './controller-sample'
import { createDpadRepeater } from './dpad-repeat'
import { DPAD_NAVIGATION_BINDINGS } from './dpad-navigation-bindings'
import { axisOf, isDown, outsideDeadZone, wentDown } from './sample-edges'
import { createTapTracker } from './tap-tracker'

/**
 * Samples in, intents out. A button produces one intent when it goes down (or, for a tap binding,
 * when it comes up alone). A trigger produces a scroll per sample for as long as it is held, and
 * says how much time that sample stands for, because how often samples arrive is the device's
 * business and a held trigger can send none at all.
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
  /**
   * List movement, contract as of `004` LOOP-R2. Off, a controller-only user cannot open any
   * host but the first — see `dpad-navigation-bindings.ts` for why that stopped being an
   * experiment. Still a flag, because a pad with no D-pad exists and this is how it says so.
   */
  readonly dpadNavigation: boolean
  /** A held D-pad direction waits this long, then repeats at the interval. */
  readonly dpadRepeatDelayMs: number
  readonly dpadRepeatIntervalMs: number
}

/** Floors, used when a pad declares no flat zone at all rather than a considered default. */
export const DEFAULT_CONTROLLER_POLICY: ControllerPolicy = {
  stickDeadZone: 0.15,
  triggerDeadZone: 0.1,
  triggersAnalog: true,
  dpadNavigation: true,
  dpadRepeatDelayMs: 350,
  dpadRepeatIntervalMs: 90
}

/** What the layer above knows that a sample cannot say. */
export type ResolveContext = {
  /** An open wheel owns the pad: a press made now must not act once the wheel closes. */
  readonly captured: boolean
}

/** The first sample of a hold stands for one nominal frame; later ones for the real gap. */
const SCROLL_FIRST_STEP_MS = 16
/** A stalled JavaScript thread must not turn into a jump. */
const SCROLL_MAX_STEP_MS = 50

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
      if (binding.timing === 'tap') {
        continue
      }
      // The chord is read from the current sample, so releasing Y restores the plain action on
      // the very next press rather than leaving a mode behind (CTRL-R4).
      const chordMatches = binding.chord === null ? !chordHeld : isDown(next, binding.chord)
      if (!chordMatches || !wentDown(previous, next, binding.button)) {
        continue
      }
      const intent = buttonIntent(binding)
      if (intent !== null) {
        intents.push(intent)
      }
      continue
    }

    if (binding.kind === 'trigger') {
      const value = axisOf(next, binding.axis)
      if (value <= policy.triggerDeadZone) {
        continue
      }
      const wasHeld = axisOf(previous, binding.axis) > policy.triggerDeadZone
      intents.push({
        kind: 'scroll',
        direction: binding.direction,
        velocity: policy.triggersAnalog ? value : 1,
        elapsedMs: wasHeld
          ? Math.min(Math.max(next.sampledAt - previous.sampledAt, 0), SCROLL_MAX_STEP_MS)
          : SCROLL_FIRST_STEP_MS,
        begins: !wasHeld
      })
      continue
    }

    if (binding.kind === 'stick') {
      const [horizontal, vertical] = binding.axes
      const x = axisOf(next, horizontal)
      const y = axisOf(next, vertical)
      const out = outsideDeadZone(x, y, policy.stickDeadZone)
      const wasOut = outsideDeadZone(
        axisOf(previous, horizontal),
        axisOf(previous, vertical),
        policy.stickDeadZone
      )
      if (out) {
        // Only a stick that moved: a held one is a held wheel, not a stream of new gestures.
        if (!wasOut || x !== axisOf(previous, horizontal) || y !== axisOf(previous, vertical)) {
          intents.push({ kind: 'wheel-motion', wheel: binding.wheel, x, y })
        }
      } else if (wasOut) {
        // Release as a true centre: the wheel's own dead zone may be narrower than the pad's, and
        // a wheel that never hears the stick return would stay open.
        intents.push({ kind: 'wheel-motion', wheel: binding.wheel, x: 0, y: 0 })
      }
    }
  }

  if (policy.dpadNavigation) {
    for (const binding of DPAD_NAVIGATION_BINDINGS) {
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

export type ControllerResolver = (
  sample: ControllerSample,
  context?: ResolveContext
) => readonly ControllerIntent[]

/**
 * The stateful form the provider mounts. It holds the previous sample, which is what makes an
 * edge detectable, and the two rules that need a memory of their own: a tap's release and a
 * D-pad hold. Everything else is the pure resolver above.
 */
export function createControllerIntentResolver(
  policy: ControllerPolicy = DEFAULT_CONTROLLER_POLICY
): ControllerResolver {
  let previous = neutralSample(0)
  const taps = createTapTracker()
  const repeat = createDpadRepeater({
    delayMs: policy.dpadRepeatDelayMs,
    intervalMs: policy.dpadRepeatIntervalMs
  })
  return (sample, context = { captured: false }) => {
    const intents = [
      ...resolveControllerIntents(previous, sample, policy),
      ...taps(previous, sample, context.captured),
      ...(policy.dpadNavigation ? repeat(previous, sample, context.captured) : [])
    ]
    previous = sample
    return intents
  }
}
